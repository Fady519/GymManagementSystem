using ClosedXML.Excel;
using System.Globalization;
using System.Text;

namespace GymManagementAPI.Infrastructure.Exports
{
    public enum ExportFormat
    {
        Xlsx = 0,
        Csv = 1
    }

    /// <summary>One column of an export: its title and how to read the value from a row.</summary>
    public sealed record ExportColumn<T>(string Header, Func<T, object?> Value);

    /// <summary>A ready-to-download file.</summary>
    public sealed record ExportFile(byte[] Content, string ContentType, string FileName);

    /// <summary>
    /// Turns a list of rows + column definitions into a CSV or an Excel file.
    /// Values keep their type (numbers stay numbers, dates stay dates) so Excel can sort and sum them.
    /// </summary>
    public static class TableExporter
    {
        public const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        public const string CsvContentType = "text/csv; charset=utf-8";

        /// <summary>Excel's column widths are measured on the first rows only (measuring 10 000 rows is slow).</summary>
        private const int RowsToMeasure = 200;

        #region CSV

        public static byte[] ToCsv<T>(IReadOnlyList<T> rows, IReadOnlyList<ExportColumn<T>> columns)
        {
            var csv = new StringBuilder();

            csv.AppendJoin(',', columns.Select(c => CsvCell(c.Header))).Append("\r\n");
            foreach (var row in rows)
                csv.AppendJoin(',', columns.Select(c => CsvCell(c.Value(row)))).Append("\r\n");

            // UTF-8 WITH a BOM (3 bytes at the start). Excel looks for it to know the file is UTF-8;
            // without it, Arabic names open as unreadable characters.
            var utf8WithBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
            return [.. utf8WithBom.GetPreamble(), .. utf8WithBom.GetBytes(csv.ToString())];
        }

        /// <summary>
        /// One CSV cell. Text is protected against "CSV injection": a cell that starts with = + - @
        /// is run as a formula when the file is opened in Excel (e.g. a member named "=HYPERLINK(...)").
        /// A leading apostrophe makes Excel show it as plain text. Numbers are not touched (-50 stays a number).
        /// </summary>
        internal static string CsvCell(object? value)
        {
            var text = value switch
            {
                null => "",
                string s => s.Length > 0 && "=+-@\t\r".Contains(s[0]) ? "'" + s : s,
                DateTime d => d.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
                DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                decimal m => m.ToString("0.00", CultureInfo.InvariantCulture),
                bool b => b ? "Yes" : "No",
                _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? ""
            };

            // Commas, quotes and new lines must be inside quotes; a quote inside is written twice.
            return text.IndexOfAny([',', '"', '\r', '\n']) >= 0
                ? "\"" + text.Replace("\"", "\"\"") + "\""
                : text;
        }

        #endregion

        #region Excel

        public static byte[] ToXlsx<T>(string sheetName, IReadOnlyList<T> rows, IReadOnlyList<ExportColumn<T>> columns)
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add(sheetName);

            for (var col = 0; col < columns.Count; col++)
                sheet.Cell(1, col + 1).Value = columns[col].Header;

            for (var r = 0; r < rows.Count; r++)
            {
                for (var col = 0; col < columns.Count; col++)
                    SetCell(sheet.Cell(r + 2, col + 1), columns[col].Value(rows[r]));
            }

            var header = sheet.Row(1);
            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#DCFCE7");

            sheet.SheetView.FreezeRows(1);                     // the header stays visible when scrolling
            sheet.Range(1, 1, rows.Count + 1, columns.Count).SetAutoFilter();
            sheet.Columns(1, columns.Count).AdjustToContents(1, Math.Min(rows.Count + 1, RowsToMeasure));

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        /// <summary>
        /// Text is always stored as text (ClosedXML never turns "=..." into a formula when we set
        /// a string value), so Excel files are safe from formula injection without any escaping.
        /// </summary>
        private static void SetCell(IXLCell cell, object? value)
        {
            switch (value)
            {
                case null:
                    cell.Value = Blank.Value;
                    break;
                case string s:
                    cell.Value = s;
                    break;
                case int i:
                    cell.Value = i;
                    break;
                case decimal m:
                    cell.Value = m;
                    cell.Style.NumberFormat.Format = "#,##0.00";
                    break;
                case DateTime d:
                    cell.Value = d;
                    cell.Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
                    break;
                case DateOnly d:
                    cell.Value = d.ToDateTime(TimeOnly.MinValue);
                    cell.Style.DateFormat.Format = "yyyy-mm-dd";
                    break;
                case bool b:
                    cell.Value = b ? "Yes" : "No";
                    break;
                default:
                    cell.Value = Convert.ToString(value, CultureInfo.InvariantCulture);
                    break;
            }
        }

        #endregion
    }
}
