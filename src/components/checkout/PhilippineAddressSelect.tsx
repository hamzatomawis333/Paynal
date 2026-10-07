import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, TriangleAlert } from "lucide-react";

// Type-only import: erased at build time, so it costs nothing at runtime.
import type { PHLCity, PHLRegion } from "@/data/phl-regions";
import type { PhilippineAddress } from "@/lib/phl-address";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/** Mirrors barangayKey() in the data module, inlined so the module itself can
 *  stay out of the main bundle. */
const cityKey = (city: PHLCity): string => `${city.name}|${city.province}`;

// Barangay lists total ~42k entries, so they are fetched on demand rather than
// bundled into the main bundle. Each city is fetched at most once per session.
const barangayCache = new Map<string, string[]>();
const barangayPending = new Map<string, Promise<string[]>>();

// The dev server runs at the origin root, but Apache serves this app from the
// /Paynal-main/ subdirectory. BASE_URL covers a configured base path; the
// root-absolute path is the fallback for a root-served deployment.
const BARANGAY_SOURCES = [
  `${import.meta.env.BASE_URL}data/phl-barangays.json`,
  "/data/phl-barangays.json",
];

async function fetchBarangaySource(
  signal: AbortSignal,
): Promise<Record<string, string[]>> {
  let lastError: unknown;
  for (const url of BARANGAY_SOURCES) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`${url} responded ${res.status}`);
      return (await res.json()) as Record<string, string[]>;
    } catch (err) {
      // An abort is a genuine cancellation, never a reason to try the next URL.
      if (signal.aborted) throw err;
      lastError = err;
    }
  }
  throw new Error(
    `Could not load barangays (tried ${BARANGAY_SOURCES.join(", ")}): ${String(lastError)}`,
  );
}

function loadBarangays(city: PHLCity, signal: AbortSignal): Promise<string[]> {
  const key = cityKey(city);
  const cached = barangayCache.get(key);
  if (cached) return Promise.resolve(cached);

  const inFlight = barangayPending.get(key);
  if (inFlight) return inFlight;

  const request = fetchBarangaySource(signal)
    .then((all) => {
      const list = all[key] ?? [];
      barangayCache.set(key, list);
      barangayPending.delete(key);
      return list;
    })
    .catch((err) => {
      barangayPending.delete(key);
      throw err;
    });

  barangayPending.set(key, request);
  return request;
}

interface Props {
  value: PhilippineAddress;
  onChange: (value: PhilippineAddress) => void;
  disabled?: boolean;
}

/**
 * Region -> Province -> City/Municipality -> Barangay picker backed by the
 * generated PSA PSGC dataset. Changing a parent clears every dependent level
 * so an invalid combination can never be submitted.
 */
export default function PhilippineAddressSelect({
  value,
  onChange,
  disabled,
}: Props) {
  // The region -> province -> city tree is ~75 KB and only needed here, so it
  // is pulled in as its own chunk instead of sitting in the main bundle.
  const [regions, setRegions] = useState<PHLRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState(false);

  useEffect(() => {
    let active = true;
    import("@/data/phl-regions")
      .then((mod) => {
        if (!active) return;
        setRegions(mod.PH_REGIONS);
        setRegionsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setRegionsError(true);
        setRegionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const region = useMemo(
    () => regions.find((r) => r.name === value.region),
    [regions, value.region],
  );
  const province = useMemo(
    () => region?.provinces.find((p) => p.name === value.province),
    [region, value.province],
  );
  const city = useMemo<PHLCity | undefined>(
    () =>
      province?.cities.find(
        (c) => c.name === value.city && c.province === value.province,
      ),
    [province, value.city, value.province],
  );

  const [barangays, setBarangays] = useState<string[]>([]);
  const [barangayLoading, setBarangayLoading] = useState(false);
  const [barangayError, setBarangayError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [barangayOpen, setBarangayOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestRef.current?.abort();

    if (!city) {
      setBarangays([]);
      setBarangayLoading(false);
      setBarangayError(null);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setBarangayLoading(true);
    setBarangayError(null);

    loadBarangays(city, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setBarangays(list);
        setBarangayLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setBarangays([]);
        setBarangayLoading(false);
        setBarangayError(
          err instanceof Error && err.name === "AbortError"
            ? "Request cancelled"
            : "Could not load barangays. Check your connection and retry.",
        );
      });

    return () => controller.abort();
  }, [city, retryToken]);

  const setRegion = (name: string) =>
    onChange({ region: name, province: "", city: "", barangay: "" });
  const setProvince = (name: string) =>
    onChange({ ...value, province: name, city: "", barangay: "" });
  const setCity = (c: PHLCity) =>
    onChange({ ...value, city: c.name, barangay: "" });

  const triggerClass =
    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address-region">Region</Label>
          <Select
            value={value.region || undefined}
            onValueChange={setRegion}
            disabled={disabled || regionsLoading}
          >
            <SelectTrigger id="address-region">
              <SelectValue
                placeholder={
                  regionsLoading ? "Loading regions..." : "Select region"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {regionsError && (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
              Could not load the address list. Refresh the page to retry.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address-province">Province</Label>
          <Select
            value={value.province || undefined}
            onValueChange={setProvince}
            disabled={disabled || !region}
          >
            <SelectTrigger id="address-province">
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {region?.provinces.map((p) => (
                <SelectItem key={p.name} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address-city">City / Municipality</Label>
          <Select
            value={value.city || undefined}
            onValueChange={(name) => {
              const selected = province?.cities.find(
                (c) => c.name === name && c.province === value.province,
              );
              if (selected) setCity(selected);
            }}
            disabled={disabled || !province}
          >
            <SelectTrigger id="address-city">
              <SelectValue placeholder="Select city / municipality" />
            </SelectTrigger>
            <SelectContent>
              {province?.cities.map((c) => (
                <SelectItem key={`${c.name}|${c.province}`} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address-barangay">Barangay</Label>
          <Popover open={barangayOpen} onOpenChange={setBarangayOpen}>
            <PopoverTrigger asChild>
              <Button
                id="address-barangay"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={barangayOpen}
                disabled={disabled || !city}
                className={cn(
                  triggerClass,
                  !value.barangay && "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  {barangayLoading
                    ? "Loading barangays..."
                    : value.barangay || "Select barangay"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command shouldFilter>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Search barangay..."
                    className="h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <CommandList>
                  {barangayError ? (
                    <div className="space-y-2 p-3 text-sm">
                      <p className="flex items-start gap-2 text-destructive">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        {barangayError}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRetryToken((t) => t + 1)}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>
                        No barangay found.
                      </CommandEmpty>
                      <CommandGroup>
                        {barangays.map((b) => (
                          <CommandItem
                            key={b}
                            value={b}
                            onSelect={() => {
                              onChange({ ...value, barangay: b });
                              setBarangayOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                value.barangay === b
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {b}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {barangayLoading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching barangay list
            </p>
          )}
        </div>
      </div>
    </div>
  );
}