import { useEffect, useState, useMemo } from "react";
import { MasterDataRow } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Loader2, AlertTriangle, FileCheck2, ShieldAlert, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

export default function MasterData() {
  const navigate = useNavigate();
  const [data, setData] = useState<MasterDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof MasterDataRow | "status">("invoice");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Dialog states for gate pass creation warnings
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const formatStandardDate = (dateVal: any) => {
    if (!dateVal) return "-";
    const dateStr = String(dateVal).trim();
    if (!dateStr) return "-";

    // Handle Excel numeric date serial
    if (/^\d+(\.\d+)?$/.test(dateStr)) {
      const serial = parseFloat(dateStr);
      if (serial > 30000 && serial < 60000) {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
      }
    }

    // Try parsing standard Date format and format as MM/DD/YYYY
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return d.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    return dateStr;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get Master Data from LocalStorage
      let localMasterData: MasterDataRow[] = [];
      const stored = localStorage.getItem("masterData");
      if (stored) {
        localMasterData = JSON.parse(stored);
      }

      // Fetch gate pass records to check for issued status
      const { data: gpRecords, error: gpError } = await supabase.from('gate_pass_records').select('gate_pass_no, rows');

      if (gpError) throw gpError;
      
      // Calculate which invoices have been issued gate passes
      const issuedInvoices = new Map<string, string>();
      if (gpRecords) {
        for (const gp of gpRecords) {
          const rows = gp.rows as any[];
          for (const row of rows) {
            issuedInvoices.set(row.invoice, gp.gate_pass_no);
          }
        }
      }

      // Deduplicate by Invoice number and sum/join fields
      const aggregatedMap = new Map<string, MasterDataRow>();
      
      // Collect lists of metadata to make comma separated sets
      const groupDetails = new Map<string, {
        order_nos: Set<string>;
        do_bols: Set<string>;
        cust_pos: Set<string>;
        buyers: Set<string>;
        locations: Set<string>;
      }>();

      for (const row of localMasterData) {
        const invNo = row.invoice;
        
        if (!groupDetails.has(invNo)) {
          groupDetails.set(invNo, {
            order_nos: new Set<string>(),
            do_bols: new Set<string>(),
            cust_pos: new Set<string>(),
            buyers: new Set<string>(),
            locations: new Set<string>(),
          });
        }
        
        const details = groupDetails.get(invNo)!;
        if (row.order_no) details.order_nos.add(row.order_no);
        if (row.do_bol) details.do_bols.add(row.do_bol);
        if (row.cust_po) details.cust_pos.add(row.cust_po);
        if (row.ship_via_description) details.buyers.add(row.ship_via_description);
        if (row.consignee_address_3) details.locations.add(row.consignee_address_3);

        if (aggregatedMap.has(invNo)) {
          const existing = aggregatedMap.get(invNo)!;
          existing.qty_invoiced = Number(existing.qty_invoiced) + Number(row.qty_invoiced);
          existing.extended_price = Number(existing.extended_price) + Number(row.extended_price);
          if (row.rma_status) {
            existing.rma_status = true;
          }
        } else {
          const newRow = { ...row };
          if (issuedInvoices.has(invNo)) {
            newRow.gate_pass_issued = issuedInvoices.get(invNo);
          }
          aggregatedMap.set(invNo, newRow);
        }
      }

      // Apply joined list strings back to aggregated row data
      for (const [invNo, row] of aggregatedMap.entries()) {
        const details = groupDetails.get(invNo)!;
        row.order_no = Array.from(details.order_nos).join(", ");
        row.do_bol = Array.from(details.do_bols).join(", ");
        row.cust_po = Array.from(details.cust_pos).join(", ");
        row.ship_via_description = Array.from(details.buyers).join(", ");
        row.consignee_address_3 = Array.from(details.locations).join(", ");
      }

      setData(Array.from(aggregatedMap.values()));
    } catch (err: any) {
      toast.error(`Error loading master data summary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const exportRows = filteredData.map(row => ({
      "Invoice": row.invoice,
      "Customer Name": row.name,
      "Invoice Date": formatStandardDate(row.invoice_date),
      "Order No": row.order_no,
      "Qty Inv": row.qty_invoiced,
      "Value": row.extended_price,
      "DO/BOL": row.do_bol,
      "PO": row.cust_po || "",
      "BUYER": row.ship_via_description || "",
      "Location": row.consignee_address_3 || "",
      "Status": row.gate_pass_issued ? `Issued: ${row.gate_pass_issued}` : "Pending",
      "RMA Status": row.rma_status ? "RMA EXISTS" : "No RMA"
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData");
    XLSX.writeFile(wb, "Stretchline_Master_Data_Summary.xlsx");
  };

  const handleSort = (field: keyof MasterDataRow | "status") => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortHeader = (
    label: string, 
    field: keyof MasterDataRow | "status", 
    align: "left" | "right" | "center" = "left",
    className?: string
  ) => {
    const isSorted = sortField === field;
    const justifyClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
    return (
      <TableHead 
        className={`cursor-pointer select-none hover:bg-muted/70 transition-colors py-3 group ${className || ""}`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center gap-1 font-semibold text-xs text-foreground cursor-pointer ${justifyClass}`}>
          <span>{label}</span>
          <span className="text-muted-foreground/50 group-hover:text-muted-foreground">
            {isSorted ? (
              sortDirection === "asc" ? (
                <ChevronUp className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </TableHead>
    );
  };

  const filteredData = useMemo(() => {
    // 1. Filter
    const filtered = data.filter(row => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        row.invoice.toLowerCase().includes(term) ||
        row.name.toLowerCase().includes(term) ||
        row.order_no.toLowerCase().includes(term) ||
        row.do_bol.toLowerCase().includes(term) ||
        (row.cust_po && row.cust_po.toLowerCase().includes(term)) ||
        (row.ship_via_description && row.ship_via_description.toLowerCase().includes(term)) ||
        (row.consignee_address_3 && row.consignee_address_3.toLowerCase().includes(term))
      );
    });

    // 2. Sort
    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortField === "status") {
        aVal = a.gate_pass_issued ? `Issued: ${a.gate_pass_issued}` : "Pending";
        bVal = b.gate_pass_issued ? `Issued: ${b.gate_pass_issued}` : "Pending";
      } else if (sortField === "invoice_date") {
        const aDate = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
        const bDate = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
        aVal = isNaN(aDate) ? String(a.invoice_date).toLowerCase() : aDate;
        bVal = isNaN(bDate) ? String(b.invoice_date).toLowerCase() : bDate;
      } else {
        aVal = a[sortField as keyof MasterDataRow];
        bVal = b[sortField as keyof MasterDataRow];
      }

      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      // Sort numbers numerically
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Sort booleans
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        const aNum = aVal ? 1 : 0;
        const bNum = bVal ? 1 : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      // Convert to string and compare
      const aStr = String(aVal).toLowerCase().trim();
      const bStr = String(bVal).toLowerCase().trim();

      if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, searchTerm, sortField, sortDirection]);

  const handleToggleInvoice = (invoice: string, customerName: string, gatePassIssued: string | null | undefined, hasRmaWarning: boolean) => {
    if (selectedInvoices.includes(invoice)) {
      setSelectedInvoices(prev => prev.filter(inv => inv !== invoice));
      return;
    }

    if (gatePassIssued) {
      toast.error(`Blocked: Gate pass already issued [${gatePassIssued}] for invoice ${invoice}.`);
      return;
    }

    if (hasRmaWarning) {
      toast.error(`Blocked: Invoice ${invoice} has an active RMA warning/restriction and cannot be used to generate a gate pass.`);
      return;
    }

    // Business Rule: Same customer enforcement
    if (selectedInvoices.length > 0) {
      const firstInvoice = data.find(r => r.invoice === selectedInvoices[0]);
      if (firstInvoice && firstInvoice.name !== customerName) {
        toast.error("Gate pass can only contain invoices from a single customer.");
        return;
      }
    }

    setSelectedInvoices(prev => [...prev, invoice]);
  };

  const handleCreateGatePass = async () => {
    if (selectedInvoices.length === 0) return;

    // Check for warnings/blocks
    const selectedRows = data.filter(row => selectedInvoices.includes(row.invoice));
    
    // Safety check for already issued (though selection blocks it now)
    const alreadyIssued = selectedRows.find(r => r.gate_pass_issued);
    if (alreadyIssued) {
      toast.error(`Blocked: Invoice ${alreadyIssued.invoice} already has Gate Pass [${alreadyIssued.gate_pass_issued}].`);
      return;
    }

    // Block RMA entirely
    const hasRMA = selectedRows.some(r => r.rma_status);
    if (hasRMA) {
      toast.error("Blocked: One or more selected invoices have an active RMA warning and cannot be used to generate a gate pass.");
      return;
    }

    // Double check with database to be strictly safe
    try {
      const { data: gpRecords, error } = await supabase
        .from('gate_pass_records')
        .select('gate_pass_no, rows');
        
      if (!error && gpRecords) {
        let existingGpNo = null;
        let existingInvoice = null;
        
        outer: for (const gp of gpRecords) {
          const rows = gp.rows as any[];
          for (const row of rows) {
            if (selectedInvoices.includes(row.invoice)) {
              existingGpNo = gp.gate_pass_no;
              existingInvoice = row.invoice;
              break outer;
            }
          }
        }

        if (existingGpNo) {
          toast.error(`Blocked: Invoice ${existingInvoice} was already used in Gate Pass [${existingGpNo}] by another user.`);
          return;
        }
      }
    } catch (e) {
      console.error(e);
      // proceed anyway if check fails
    }

    proceedToGatePass();
  };

  const proceedToGatePass = () => {
    setShowWarningModal(false);
    // Pass state via router
    const selectedRows = data.filter(row => selectedInvoices.includes(row.invoice));
    navigate('/gate-pass/new', { state: { selectedRows } });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">Master Data & summary</h1>
          <p className="text-muted-foreground">Unified billing data aggregated by Invoice number</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>

          <Button 
            disabled={selectedInvoices.length === 0} 
            onClick={handleCreateGatePass}
            className="font-semibold"
          >
            <FileCheck2 className="mr-2 h-4 w-4" />
            Create Gate Pass ({selectedInvoices.length})
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search invoice, customer, order, do..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
          {filteredData.length} Invoice(s)
        </Badge>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-auto w-full min-w-0">
        <div className="min-w-[1200px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12 text-center"></TableHead>
                {renderSortHeader("Invoice", "invoice", "left", "w-24 whitespace-nowrap")}
                {renderSortHeader("Customer Name", "name", "left", "min-w-[180px] whitespace-nowrap")}
                {renderSortHeader("Invoice Date", "invoice_date", "left", "whitespace-nowrap")}
                {renderSortHeader("Order No", "order_no", "left", "whitespace-nowrap")}
                {renderSortHeader("Qty Inv", "qty_invoiced", "right", "whitespace-nowrap")}
                {renderSortHeader("Value", "extended_price", "right", "whitespace-nowrap")}
                {renderSortHeader("DO/BOL", "do_bol", "left", "whitespace-nowrap")}
                {renderSortHeader("PO", "cust_po", "left", "whitespace-nowrap")}
                {renderSortHeader("BUYER", "ship_via_description", "left", "whitespace-nowrap")}
                {renderSortHeader("Location", "consignee_address_3", "left", "min-w-[150px] whitespace-nowrap")}
                {renderSortHeader("Status", "status", "center", "whitespace-nowrap")}
                {renderSortHeader("RMA Status", "rma_status", "center", "whitespace-nowrap")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      Loading master summary content...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-48 text-center text-muted-foreground font-medium">
                    No records found. Upload reports in Data Upload page.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => {
                  const isSelected = selectedInvoices.includes(row.invoice);
                  const isIssued = !!row.gate_pass_issued;
                  return (
                    <TableRow 
                      key={row.invoice} 
                      className={isSelected ? "bg-primary/5 hover:bg-primary/10" : (isIssued ? "opacity-70 bg-gray-50/50 hover:bg-gray-50 dark:bg-slate-900/10 dark:hover:bg-slate-900/20" : "")}
                    >
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={isSelected}
                          disabled={(isIssued || !!row.rma_status) && !isSelected}
                          onCheckedChange={() => handleToggleInvoice(row.invoice, row.name, row.gate_pass_issued, !!row.rma_status)}
                          className="translate-y-[2px]"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-xs whitespace-nowrap">{row.invoice}</TableCell>
                      <TableCell className="truncate max-w-[200px] text-xs font-medium" title={row.name}>{row.name}</TableCell>
                      <TableCell className="text-xs">{formatStandardDate(row.invoice_date)}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]" title={row.order_no}>{row.order_no}</TableCell>
                      <TableCell className="text-right font-medium text-xs font-mono">{(Number(row.qty_invoiced) || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-xs font-mono">${(Number(row.extended_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]" title={row.do_bol}>{row.do_bol}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]" title={row.cust_po || "-"}>{row.cust_po || "-"}</TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]" title={row.ship_via_description || "-"}>{row.ship_via_description || "-"}</TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]" title={row.consignee_address_3 || "-"}>{row.consignee_address_3 || "-"}</TableCell>
                      <TableCell className="text-center whitespace-nowrap text-xs">
                        {isIssued ? (
                          <Badge variant="secondary" className="bg-slate-200 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Issued: {row.gate_pass_issued}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/20">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.rma_status ? (
                          <Badge variant="destructive" className="mx-auto flex w-max items-center px-1.5 py-0.5 justify-center">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            RMA
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Validation Warning
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              {warningMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowWarningModal(false)}>
              Cancel
            </Button>
            <Button onClick={proceedToGatePass} className="bg-amber-600 hover:bg-amber-700 text-white">
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
