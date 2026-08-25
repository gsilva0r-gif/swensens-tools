window.SWENSENS_CONFIG = {
  supabaseUrl: "https://uupgkbjevofcokjgomzp.supabase.co",
  supabasePublishableKey: "sb_publishable_jcs3afBDv82m5kX1HaoaCw_PUGes8lK",
  staffEmailDomain: "staff.swensens.app",
};

window.staffEmailFromCode = function staffEmailFromCode(code) {
  const cleaned = String(code || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  return cleaned ? cleaned + "@" + window.SWENSENS_CONFIG.staffEmailDomain : "";
};
