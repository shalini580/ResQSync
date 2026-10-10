export const StatusBadge = ({ status, size = "sm" }) => {
  const s = String(status).toUpperCase();
  let styles = "bg-dust-grey-100 text-dust-grey-700 border-dust-grey-300";
  if (s === "CRITICAL") {
    styles =
      "bg-cherry-rose-50 text-cherry-rose-700 border-cherry-rose-300 font-semibold";
  } else if (s === "VERY UNSTABLE") {
    styles =
      "bg-cherry-rose-50 text-cherry-rose-800 border-cherry-rose-200 font-semibold";
  } else if (s === "UNSTABLE") {
    styles =
      "bg-honey-bronze-50 text-honey-bronze-800 border-honey-bronze-300 font-semibold";
  } else if (s === "STABLE") {
    styles =
      "bg-muted-teal-50 text-muted-teal-800 border-muted-teal-300 font-semibold";
  } else if (s === "LOW") {
    styles =
      "bg-dust-grey-100 text-dust-grey-700 border-dust-grey-300 font-medium";
  } else if (s === "RUNNING") {
    styles =
      "bg-muted-teal-100 text-muted-teal-900 border-muted-teal-300 font-medium";
  } else if (s === "READY") {
    styles =
      "bg-coffee-bean-50 text-coffee-bean-800 border-coffee-bean-200 font-medium";
  } else if (s === "WAITING") {
    styles =
      "bg-honey-bronze-50 text-honey-bronze-800 border-honey-bronze-300 font-medium";
  } else if (s === "NEW") {
    styles =
      "bg-coffee-bean-100 text-coffee-bean-900 border-coffee-bean-300 font-medium";
  } else if (s === "TERMINATED") {
    styles = "bg-dust-grey-100 text-dust-grey-500 border-dust-grey-300";
  } else if (s === "AVAILABLE") {
    styles = "bg-muted-teal-50 text-muted-teal-800 border-muted-teal-300";
  } else if (s === "ASSIGNED") {
    styles = "bg-coffee-bean-50 text-coffee-bean-800 border-coffee-bean-300";
  } else if (s === "PICKUP") {
    styles = "bg-honey-bronze-50 text-honey-bronze-800 border-honey-bronze-300";
  } else if (s === "IN TRANSIT") {
    styles =
      "bg-honey-bronze-100 text-honey-bronze-900 border-honey-bronze-400 font-medium";
  } else if (s === "DELIVERED") {
    styles =
      "bg-muted-teal-50 text-muted-teal-800 border-muted-teal-300 font-medium";
  } else if (s === "COMPLETED" || s === "RESOLVED") {
    styles =
      "bg-muted-teal-100 text-muted-teal-900 border-muted-teal-400 font-semibold";
  } else if (s === "LOW STOCK") {
    styles =
      "bg-honey-bronze-50 text-honey-bronze-800 border-honey-bronze-300 font-medium";
  } else if (s === "UNAVAILABLE") {
    styles =
      "bg-cherry-rose-50 text-cherry-rose-700 border-cherry-rose-300 font-semibold";
  } else if (s === "VERIFIED" || s === "ACTIVE") {
    styles =
      "bg-muted-teal-50 text-muted-teal-800 border-muted-teal-300 font-medium";
  } else if (s === "PENDING" || s === "UNDER REVIEW") {
    styles =
      "bg-honey-bronze-50 text-honey-bronze-800 border-honey-bronze-300 font-medium";
  } else if (s === "REJECTED" || s === "SUSPENDED") {
    styles =
      "bg-cherry-rose-50 text-cherry-rose-700 border-cherry-rose-300 font-semibold";
  }
  const px = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono tracking-tight ${px} ${styles}`}
    >
      {status}
    </span>
  );
};
