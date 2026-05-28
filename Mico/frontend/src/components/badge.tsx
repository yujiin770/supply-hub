/** Generic coloured badge. */
export function Badge({
  label,
  color,
}: {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "purple" | "gray" | "orange";
}) {
  const classes: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    gray: "bg-slate-100 text-slate-600",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5 ${classes[color]}`}
    >
      {label}
    </span>
  );
}

/** Maps a SupplierStatus string to a Badge. */
export function SupplierStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    {
      label: string;
      color: "green" | "yellow" | "red" | "blue" | "purple" | "gray" | "orange";
    }
  > = {
    DRAFT: { label: "Draft", color: "gray" },
    PENDING_KYC: { label: "Pending KYC", color: "yellow" },
    PENDING_APPROVAL: { label: "Pending Approval", color: "blue" },
    APPROVED: { label: "Approved", color: "green" },
    REJECTED: { label: "Rejected", color: "red" },
    SUSPENDED: { label: "Suspended", color: "orange" },
  };
  const cfg = map[status] ?? { label: status, color: "gray" as const };
  return <Badge label={cfg.label} color={cfg.color} />;
}

/** Maps a KycDocStatus string to a Badge. */
export function KycDocStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    {
      label: string;
      color: "green" | "yellow" | "red" | "blue" | "purple" | "gray" | "orange";
    }
  > = {
    SUBMITTED: { label: "Submitted", color: "yellow" },
    APPROVED: { label: "Approved", color: "green" },
    REJECTED: { label: "Rejected", color: "red" },
  };
  const cfg = map[status] ?? { label: status, color: "gray" as const };
  return <Badge label={cfg.label} color={cfg.color} />;
}
