import "./../styles/status.css";

function StatusDot({
    status = "Offline",
    className = "",
}) {
    const normalizedStatus =
        status.toLowerCase();

    return (
        <span
            className={`status-dot status-${normalizedStatus} ${className}`}
            aria-label={status}
        />
    );
}

export default StatusDot;