import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadAsCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    return;
  }

  // Convert all values to string and handle null/undefined
  const sanitizedData = data.map(row => {
    const newRow: {[key: string]: string} = {};
    for (const key in row) {
      if (row[key] === null || row[key] === undefined) {
        newRow[key] = "";
      } else {
        newRow[key] = String(row[key]);
      }
    }
    return newRow;
  });

  const headers = Object.keys(sanitizedData.reduce((acc, row) => ({...acc, ...row}), {}));
  const csvContent = [
    headers.join(','),
    ...sanitizedData.map(row => headers.map(header => {
      let cell = row[header] || ""; // Default to empty string if undefined
      // Escape double quotes
      cell = cell.replace(/"/g, '""');
      // If the cell contains a comma, wrap it in double quotes
      if (cell.includes(',')) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
