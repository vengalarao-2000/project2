export function exportProcessedCSV(processed) {
    if (!processed || processed.length === 0) return;

    // Helper to safely escape text for CSV format
    // 1. Replaces internal double quotes (") with two double quotes ("")
    // 2. Wraps the whole string in double quotes
    const safeCSV = (text) => {
        if (!text) return '""';
        const stringText = String(text);
        return `"${stringText.replace(/"/g, '""')}"`;
    };

    const header = ["Caption", "Labels", "Moods", "Narrative"].join(",") + "\n";

    const rows = processed.map((p) => {
        // 1. Caption
        const captionCol = safeCSV(p.caption);

        // 2. Labels (Join with pipe |, then escape)
        const labelsCol = safeCSV((p.labels || []).join(" | "));

        // 3. Moods
        const moodsCol = safeCSV((p.moods || []).join(" | "));

        // 4. Narrative
        const narrativeCol = safeCSV(p.narrative || "");

        return `${captionCol},${labelsCol},${moodsCol},${narrativeCol}`;
    });

    // \uFEFF is a Byte Order Mark (BOM). 
    // It tells Excel to read the file as UTF-8 so Emojis display correctly.
    const csvContent = "\uFEFF" + header + rows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `paws_pixels_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
}