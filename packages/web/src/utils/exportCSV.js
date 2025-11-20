export function exportProcessedCSV(processed) {
    if (!processed || processed.length === 0) return;

    const rows = processed.map(
        (p) => `${p.caption},${p.labels.join(" | ")},${p.moods.join(" | ")}`
    );
    const header = "Caption,Labels,Moods\n";
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "paws_pixels_results.csv";
    link.click();
}
