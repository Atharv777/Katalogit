import { useState } from "react";
import { Download, FileSpreadsheet, Check, ArrowUpRight } from "lucide-react";
import { Product } from "../types";
export default function ExportCatalog({ products }: { products: Product[] }) {
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [downloaded, setDownloaded] = useState(false);
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const selected = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      (status === "All" || p.status === status),
  );
  function download() {
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const headers = [
      "Product SKU",
      "Product Name",
      "Category",
      "Sub-category",
      "Price",
      "Status",
      "Description",
      "Color",
      "Material",
      "Pattern",
      "Fit",
      "Occasion",
      "Tags",
    ];
    const rows = selected.map((p) => [
      p.sku,
      p.title,
      p.category,
      p.subcategory,
      p.price,
      p.status,
      p.description,
      p.attributes.Color,
      p.attributes.Material,
      p.attributes.Pattern,
      p.attributes.Fit,
      p.attributes.Occasion,
      p.tags.join(", "),
    ]);
    const blob = new Blob(
      [
        "\uFEFF" +
          [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Katalogit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  return (
    <div className="studio-page">
      <header className="studio-topbar">
        <span>
          Workspace <span>/</span> Export catalog
        </span>
        <span className="studio-status">A file you can use elsewhere</span>
      </header>
      <main className="studio-content">
        <div className="dashboard-heading">
          <div>
            <p className="section-note">Ready for your seller portal</p>
            <h1>Download your product CSV.</h1>
            <p>AI helps prepare the listing. Download the details, then upload the file to your seller portal using its import template.</p>
          </div>
          <span className="summary-icon lilac">
            <FileSpreadsheet size={22} />
          </span>
        </div>
        <div className="export-layout">
          <section className="export-config">
            <h2>Choose what to include</h2>
            <p>Pick a category and status, or download your whole catalogue.</p>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setDownloaded(false);
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All categories" : c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Product status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setDownloaded(false);
                }}
              >
                <option value="All">All statuses</option>
                <option value="active">Active</option>
                <option value="review">In review</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <div className="export-total">
              <span>Products in this file</span>
              <strong>{selected.length}</strong>
            </div>
            <button
              className="button button-coral"
              disabled={selected.length === 0}
              onClick={download}
            >
              {downloaded ? <Check size={17} /> : <Download size={17} />}{" "}
              {downloaded ? "Download again" : "Download CSV"}
            </button>
            {downloaded && (
              <p className="export-confirm" role="status">
                Your file is ready in your browser’s downloads.
              </p>
            )}
            <small>
              This is a standard CSV, not a direct marketplace connection. Match its columns to your portal’s import template before uploading.
            </small>
          </section>
          <section className="export-preview">
            <div className="export-file">
              <FileSpreadsheet size={25} />
              <div>
                <strong>Your catalog.csv</strong>
                <span>UTF-8 · Spreadsheet compatible</span>
              </div>
              <ArrowUpRight size={19} />
            </div>
            <div className="export-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.slice(0, 6).map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.title}
                        <small>{p.sku}</small>
                      </td>
                      <td>{p.category}</td>
                      <td>₹{p.price.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!selected.length && (
                <p className="export-empty">No products match these filters.</p>
              )}
            </div>
            <p className="export-preview-note">
              Previewing {Math.min(selected.length, 6)} of {selected.length}{" "}
              products. Your file includes descriptions, attributes, and tags.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
