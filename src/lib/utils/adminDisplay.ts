/** Display helpers for admin tables when refs may be ObjectIds, strings, or populated documents */

export function refIdString(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null && "_id" in ref) {
    return String((ref as { _id: string })._id);
  }
  return "";
}

export function displayFarmName(ref: unknown): string {
  if (ref == null) return "—";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null && "name" in ref) {
    const n = (ref as { name?: string }).name;
    if (n && String(n).trim()) return String(n);
  }
  return refIdString(ref) || "—";
}

export function displayFarmerName(ref: unknown): string {
  if (ref == null) return "—";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null) {
    const o = ref as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    const n = [o.firstName, o.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
    if (o.email) return o.email;
  }
  return refIdString(ref) || "—";
}

export function displayUserName(ref: unknown): string {
  return displayFarmerName(ref);
}

/** Policy number if set, else short id */
export function displayPolicyRef(ref: unknown): string {
  if (ref == null) return "—";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null) {
    const o = ref as { policyNumber?: string; _id?: string };
    if (o.policyNumber) return o.policyNumber;
    if (o._id) return String(o._id);
  }
  return "—";
}
