import { api } from "../interceptors/api";

export type AddressOption = { id: number | string; name: string };

/** Seed areas used only if the backend address list is unreachable. */
export const FALLBACK_ADDRESSES: AddressOption[] = [
  "federal_university_of_otuoke",
  "azikiel",
  "otuaba",
  "skills auditorium",
  "tee-jay estate",
  "olumba",
  "eva glass hotels",
  "after bridge",
  "kata kata",
  "highness",
].map((name, i) => ({ id: `fallback-${i}`, name }));

/** The list of areas an agent can pick from when posting a house. */
export async function getAddresses(): Promise<AddressOption[]> {
  try {
    const res = await api.get("/list/addresses");
    const rows = Array.isArray(res?.data) ? res.data : [];
    if (rows.length === 0) return FALLBACK_ADDRESSES;
    return rows.map((r: { id?: number | string; name: string }) => ({
      id: r.id ?? r.name,
      name: r.name,
    }));
  } catch {
    return FALLBACK_ADDRESSES;
  }
}

/**
 * Add a new area to the shared list ("Other" → type it → it appends to the
 * list of available addresses). Returns the saved option, or the existing
 * one when the name was already there.
 */
export async function addAddress(name: string): Promise<AddressOption> {
  const clean = name.trim();
  const res = await api.post("/list/addresses", { name: clean });
  const row = res?.data;
  return { id: row?.id ?? clean, name: row?.name ?? clean };
}
