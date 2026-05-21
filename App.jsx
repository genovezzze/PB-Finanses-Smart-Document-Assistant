import React, { useMemo, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  FolderOpen,
  Trash2,
  RotateCcw,
} from "lucide-react";

const initialClients = [
  {
    id: "c1",
    name: "SIA ABC",
    regNo: "40103000001",
    accountant: "Gunda",
    keywords: ["sia abc", "abc", "40103000001"],
  },
  {
    id: "c2",
    name: "SIA Baltic Trade",
    regNo: "40203000002",
    accountant: "Elizabete",
    keywords: ["sia baltic trade", "baltic trade", "40203000002"],
  },
  {
    id: "c3",
    name: "SIA Olympic Center",
    regNo: "40003000003",
    accountant: "Gunda",
    keywords: [
      "olimpiskais centrs",
      "olympic center",
      "sia olympic center",
      "40003000003",
    ],
  },
  {
    id: "c4",
    name: "SIA Green Office",
    regNo: "40104000004",
    accountant: "Sandra",
    keywords: ["green office", "sia green office", "40104000004"],
  },
];

const demoDocuments = [
  {
    id: crypto.randomUUID(),
    fileName: "rekins_SIA_ABC_2026-05-18_456.48_INV-1001.pdf",
    clientName: "SIA ABC",
    accountant: "Gunda",
    invoiceNo: "INV-1001",
    date: "2026-05-18",
    amount: "456.48",
    status: "Jāpārbauda",
    confidence: 92,
    folder: "Clients / SIA ABC / Neapstrādātie dokumenti",
    extractedText:
      "Invoice INV-1001. Customer SIA ABC, reg. no. 40103000001. Date 18.05.2026. Total amount 456.48 EUR.",
    notes: "Dokuments atpazīts pēc klienta reģistrācijas numura un summas.",
  },
  {
    id: crypto.randomUUID(),
    fileName: "rekins_SIA_Baltic_Trade_2026-05-19_120.00_BT-77.pdf",
    clientName: "SIA Baltic Trade",
    accountant: "Elizabete",
    invoiceNo: "BT-77",
    date: "2026-05-19",
    amount: "120.00",
    status: "Atpazīts",
    confidence: 88,
    folder: "Clients / SIA Baltic Trade / Neapstrādātie dokumenti",
    extractedText:
      "Rēķins BT-77. Klients SIA Baltic Trade, reģ. nr. 40203000002. Datums 19.05.2026. Summa 120.00 EUR.",
    notes: "Gatavs grāmatveža pārbaudei.",
  },
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[ā]/g, "a")
    .replace(/[č]/g, "c")
    .replace(/[ē]/g, "e")
    .replace(/[ģ]/g, "g")
    .replace(/[ī]/g, "i")
    .replace(/[ķ]/g, "k")
    .replace(/[ļ]/g, "l")
    .replace(/[ņ]/g, "n")
    .replace(/[š]/g, "s")
    .replace(/[ū]/g, "u")
    .replace(/[ž]/g, "z");
}

function extractDate(text) {
  const patterns = [
    /(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/,
    /(\d{1,2})[-./](\d{1,2})[-./](20\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[1].startsWith("20")) {
      const [, y, m, d] = match;
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
    }

    const [, d, m, y] = match;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return "";
}

function extractAmount(text) {
  const clean = text.replace(/,/g, ".");
  const moneyMatches = clean.match(
    /(?:summa|total|amount|eur|€)?\s*(\d{1,6}\.\d{2})\s*(?:eur|€)?/gi
  );

  if (!moneyMatches) return "";

  const numbers = moneyMatches
    .map((m) => m.match(/\d{1,6}\.\d{2}/)?.[0])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => b - a);

  return numbers[0] ? numbers[0].toFixed(2) : "";
}

function extractInvoiceNo(text) {
  const patterns = [
    /(?:invoice|rēķins|rekins|nr\.?|number|pavadzīme|pavadzime)\s*[:#№-]?\s*([A-ZА-Я0-9-]{3,20})/i,
    /\b([A-Z]{1,4}-\d{2,8})\b/i,
    /\b(INV-\d{2,8})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }

  return "";
}

function detectClient(text, clients) {
  const nText = normalizeText(text);
  let best = null;
  let bestScore = 0;

  for (const client of clients) {
    let score = 0;
    const normalizedKeywords = [client.name, client.regNo, ...client.keywords].map(
      normalizeText
    );

    for (const kw of normalizedKeywords) {
      if (kw && nText.includes(kw)) {
        score += kw === normalizeText(client.regNo) ? 50 : 25;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = client;
    }
  }

  return { client: best, score: bestScore };
}

function detectDuplicate(candidate, documents) {
  return documents.find((doc) => {
    if (!doc.invoiceNo || !candidate.invoiceNo) return false;

    const sameInvoice =
      doc.invoiceNo.toLowerCase() === candidate.invoiceNo.toLowerCase();
    const sameAmount =
      doc.amount && candidate.amount && Number(doc.amount) === Number(candidate.amount);
    const sameClient = doc.clientName === candidate.clientName;

    return sameInvoice && sameAmount && sameClient;
  });
}

async function readFileText(file) {
  const lower = file.name.toLowerCase();

  if (
    lower.endsWith(".txt") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json")
  ) {
    return await file.text();
  }

  return file.name.replace(/[_-]/g, " ");
}

function statusStyle(status) {
  switch (status) {
    case "Atpazīts":
      return "bg-green-50 text-green-700 border-green-200";
    case "Jāpārbauda":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "Iespējams, dublikāts":
      return "bg-red-50 text-red-700 border-red-200";
    case "Apstrādāts":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "Neizdevās atpazīt":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export default function App() {
  const [clients] = useState(initialClients);
  const [documents, setDocuments] = useState(demoDocuments);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Visi");
  const [manualText, setManualText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      review: documents.filter((d) => d.status === "Jāpārbauda").length,
      duplicates: documents.filter((d) => d.status === "Iespējams, dublikāts")
        .length,
      processed: documents.filter((d) => d.status === "Apstrādāts").length,
    };
  }, [documents]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesQuery = normalizeText(JSON.stringify(doc)).includes(
      normalizeText(query)
    );
    const matchesStatus = statusFilter === "Visi" || doc.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  async function processFiles(files) {
    setIsProcessing(true);
    const newDocs = [];

    for (const file of files) {
      const baseText = await readFileText(file);
      const combinedText = `${file.name}\n${baseText}\n${manualText}`;

      const { client, score } = detectClient(combinedText, clients);
      const date = extractDate(combinedText);
      const amount = extractAmount(combinedText);
      const invoiceNo = extractInvoiceNo(combinedText);

      const candidate = {
        id: crypto.randomUUID(),
        fileName: file.name,
        clientName: client?.name || "Nav noteikts",
        accountant: client?.accountant || "Nav noteikts",
        invoiceNo,
        date,
        amount,
        status: client ? "Jāpārbauda" : "Neizdevās atpazīt",
        confidence: Math.min(
          98,
          score + (date ? 10 : 0) + (amount ? 10 : 0) + (invoiceNo ? 10 : 0)
        ),
        folder: client
          ? `Clients / ${client.name} / Neapstrādātie dokumenti`
          : "Manual review / Neatpazītie dokumenti",
        extractedText: combinedText,
        notes: client
          ? "Dokuments sagatavots grāmatveža pārbaudei."
          : "Nepieciešama manuāla pārbaude: klients netika droši noteikts.",
      };

      const duplicate = detectDuplicate(candidate, [...documents, ...newDocs]);

      if (duplicate) {
        candidate.status = "Iespējams, dublikāts";
        candidate.notes = `Atrasts līdzīgs dokuments: ${duplicate.fileName}`;
      }

      newDocs.push(candidate);
    }

    setDocuments((prev) => [...newDocs, ...prev]);
    setIsProcessing(false);
  }

  function handleUpload(event) {
    const files = Array.from(event.target.files || []);

    if (files.length) processFiles(files);

    event.target.value = "";
  }

  function markProcessed(id) {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              status: "Apstrādāts",
              folder:
                doc.clientName !== "Nav noteikts"
                  ? `Clients / ${doc.clientName} / Apstrādātie dokumenti`
                  : doc.folder,
              notes: "Grāmatvedis pārbaudīja un atzīmēja kā apstrādātu.",
            }
          : doc
      )
    );
  }

  function resetDemo() {
    setDocuments(demoDocuments);
    setSelectedDoc(null);
    setQuery("");
    setStatusFilter("Visi");
    setManualText("");
  }

  function deleteDoc(id) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));

    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                PB Finanses Smart Document Assistant
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Vienkāršs prototips dokumentu atpazīšanai, šķirošanai un
                dublikātu pārbaudei.
              </p>
            </div>

            <button
              onClick={resetDemo}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <RotateCcw size={16} />
              Atiestatīt demo
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">Visi dokumenti</p>
            <p className="text-2xl font-semibold mt-1">{stats.total}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">Jāpārbauda</p>
            <p className="text-2xl font-semibold mt-1">{stats.review}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">Dublikāti</p>
            <p className="text-2xl font-semibold mt-1">{stats.duplicates}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-500">Apstrādāti</p>
            <p className="text-2xl font-semibold mt-1">{stats.processed}</p>
          </div>
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="md:col-span-1 cursor-pointer rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
                  <Upload size={17} />
                  Augšupielādēt dokumentus
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.json"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>

                <div className="md:col-span-2 relative">
                  <Search
                    className="absolute left-3 top-3 text-slate-400"
                    size={16}
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Meklēt pēc klienta, summas, rēķina numura..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {[
                    "Visi",
                    "Jauns",
                    "Atpazīts",
                    "Jāpārbauda",
                    "Iespējams, dublikāts",
                    "Neizdevās atpazīt",
                    "Apstrādāts",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Papildu teksts testēšanai, piemēram: SIA ABC, INV-1001, 456.48 EUR..."
                  className="md:col-span-2 min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              {isProcessing && (
                <p className="text-sm text-slate-600">
                  Dokumenti tiek apstrādāti...
                </p>
              )}
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">
                      Dokuments
                    </th>
                    <th className="text-left font-medium px-4 py-3">
                      Klients
                    </th>
                    <th className="text-left font-medium px-4 py-3">Datums</th>
                    <th className="text-left font-medium px-4 py-3">Summa</th>
                    <th className="text-left font-medium px-4 py-3">
                      Statuss
                    </th>
                    <th className="text-right font-medium px-4 py-3">
                      Darbības
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 min-w-[220px]">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="flex items-center gap-2 text-left hover:underline"
                        >
                          <FileText size={16} className="text-slate-500" />
                          <span className="font-medium">{doc.fileName}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {doc.clientName}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {doc.date || "—"}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {doc.amount ? `${doc.amount} EUR` : "—"}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle(
                            doc.status
                          )}`}
                        >
                          {doc.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => markProcessed(doc.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                          >
                            <CheckCircle2 size={14} />
                            Apstrādāts
                          </button>

                          <button
                            onClick={() => deleteDoc(doc.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                          >
                            <Trash2 size={14} />
                            Dzēst
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredDocuments.length && (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Dokumenti nav atrasti.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-base font-semibold mb-3">
                Dokumenta detaļas
              </h2>

              {selectedDoc ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-500">Fails</p>
                    <p className="font-medium break-words">
                      {selectedDoc.fileName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-500">Klients</p>
                      <p className="font-medium">{selectedDoc.clientName}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Grāmatvedis</p>
                      <p className="font-medium">{selectedDoc.accountant}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Rēķina nr.</p>
                      <p className="font-medium">
                        {selectedDoc.invoiceNo || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Pārliecība</p>
                      <p className="font-medium">
                        {selectedDoc.confidence}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 flex items-center gap-1">
                      <FolderOpen size={14} />
                      Mape
                    </p>
                    <p className="font-medium break-words">
                      {selectedDoc.folder}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Piezīmes</p>
                    <p className="font-medium">{selectedDoc.notes}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Atpazītais teksts</p>
                    <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-xs whitespace-pre-wrap">
                      {selectedDoc.extractedText}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Izvēlieties dokumentu no tabulas, lai redzētu detaļas.
                </p>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-base font-semibold mb-3">Klientu bāze</h2>

              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-slate-500">
                      Reģ. nr.: {client.regNo}
                    </p>
                    <p className="text-xs text-slate-500">
                      Atbildīgais: {client.accountant}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                MVP ierobežojumi
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                Šis prototips demonstrē procesu: augšupielāde, klienta
                noteikšana, dublikātu pārbaude, statusi un mapju loģika. Reālā
                ieviešanā būtu jāpievieno OCR, Microsoft 365 e-pasta pieslēgums
                un Jumis API/importa integrācija.
              </p>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}