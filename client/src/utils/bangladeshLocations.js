export const BANGLADESH_DISTRICT_OPTIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isDhakaDistrict = (value) => normalizeName(value) === "dhaka";

export const getCodDeliveryChargeForDistrict = (method, district) => {
  const channelType = String(method?.channelType || "").trim().toLowerCase();
  const methodType = String(method?.type || "").trim().toLowerCase();

  if (channelType !== "cod" && methodType !== "cash on delivery") {
    return 0;
  }

  if (!String(district || "").trim()) {
    return 0;
  }

  const insideDhaka = Number(
    method?.insideDhakaShippingCost ?? method?.insideDhakaDeliveryCharge,
  );
  const outsideDhaka = Number(
    method?.outsideDhakaShippingCost ?? method?.outsideDhakaDeliveryCharge,
  );
  const legacy = Number(method?.shippingCost ?? method?.deliveryCharge);

  if (Number.isFinite(insideDhaka) || Number.isFinite(outsideDhaka)) {
    const resolved = isDhakaDistrict(district) ? insideDhaka : outsideDhaka;
    return Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
  }

  return Number.isFinite(legacy) && legacy >= 0 ? legacy : 0;
};
