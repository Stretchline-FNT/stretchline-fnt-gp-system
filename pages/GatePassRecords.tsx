import { useEffect, useState, useRef } from "react";
import { GatePassRecord } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Printer, Eye, Trash2, Edit, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { CompanySettings } from "@/types";
import * as XLSX from "xlsx";

export default function GatePassRecords() {
  const { profile } = useAuth();
  const [data, setData] = useState<GatePassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // View/Print Dialog State
  const [viewingRecord, setViewingRecord] = useState<GatePassRecord | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<GatePassRecord | null>(null);

  const isAdmin = profile?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: records, error }, { data: settings }] = await Promise.all([
        supabase.from('gate_pass_records').select('*').order('created_at', { ascending: false }),
        supabase.from('company_settings').select('*').limit(1).single()
      ]);

      if (error) throw error;
      
      setData(records as GatePassRecord[]);
      if (settings) setCompanySettings(settings);
    } catch (err: any) {
      toast.error(`Error loading records: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const savedSig = localStorage.getItem('gate_pass_signature');
    if (savedSig) {
      setSignature(savedSig);
    } else {
      setSignature("https://lmwaeuhbgvaioflvymvi.supabase.co/storage/v1/object/sign/Logo/Logo%20Dilhani.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZjQ0OThhYS01MDQzLTQzYWItODFmMS0zZWVlZTg3YWE5ZmIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvL0xvZ28gRGlsaGFuaS5wbmciLCJpYXQiOjE3ODA2NDg5NTcsImV4cCI6NDkzNDI0ODk1N30.4tGgcXz3IZ4jsuuOD-zSkkl5BcsoHdBbhI5TX8nHFvk");
    }
  }, []);

  const handleDelete = async () => {
    if (!recordToDelete) return;

    try {
      const { error } = await supabase.from('gate_pass_records').delete().eq('id', recordToDelete.id);
      if (error) throw error;
      
      toast.success(`Gate pass ${recordToDelete.gate_pass_no} deleted successfully.`);
      setData(prev => prev.filter(r => r.id !== recordToDelete.id));
    } catch (err: any) {
      toast.error(`Error deleting record: ${err.message}`);
    } finally {
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Gate_Pass-${viewingRecord?.gate_pass_no}`,
    suppressErrors: true,
  });

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.error("No records to export.");
      return;
    }

    const exportData = filteredData.map(record => ({
      "Gate Pass No": record.gate_pass_no,
      "Date": format(new Date(record.created_at), 'yyyy-MM-dd HH:mm'),
      "Customer Name": record.customer_name,
      "Vehicle Number": record.vehicle_number,
      "Driver Name": record.driver_name,
      "Total Cartons": record.total_cartons,
      "Total MTRS": record.total_mtrs,
      "Total Value ($)": record.total_value,
      "Location": record.location,
      "Created By": record.created_by,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gate Passes");
    XLSX.writeFile(workbook, `Gate_Pass_Records_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.gate_pass_no.toLowerCase().includes(term) ||
      row.customer_name.toLowerCase().includes(term) ||
      row.vehicle_number.toLowerCase().includes(term) ||
      row.date.includes(term)
    );
  });

  const companyLogo = companySettings?.logo_url || localStorage.getItem('gate_pass_logo');

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gate Pass Records</h1>
          <p className="text-muted-foreground">View and manage generated gate passes</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleExportExcel} variant="outline" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search GP No, Custom, Vehicle, Date..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-sm">
          {filteredData.length} Records
        </Badge>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-auto w-full min-w-0">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="whitespace-nowrap">Gate Pass No</TableHead>
              <TableHead className="whitespace-nowrap">Date & Time</TableHead>
              <TableHead className="whitespace-nowrap min-w-[200px]">Customer Name</TableHead>
              <TableHead className="whitespace-nowrap">Vehicle / Driver</TableHead>
              <TableHead className="whitespace-nowrap text-right">MTRS</TableHead>
              <TableHead className="whitespace-nowrap text-right">Value ($)</TableHead>
              <TableHead className="whitespace-nowrap text-right">Cartons</TableHead>
              <TableHead className="whitespace-nowrap">Created By</TableHead>
              <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    Loading records...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center text-muted-foreground font-medium">
                  No gate pass records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-primary">{row.gate_pass_no}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{row.date}</span>
                      <span className="text-xs text-muted-foreground">{row.time}</span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate max-w-[200px]" title={row.customer_name}>{row.customer_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.vehicle_number}</span>
                      <span className="text-xs text-muted-foreground">{row.driver_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{(Number(row.total_mtrs) || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(Number(row.total_value) || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.total_cartons}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{row.created_by}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(row.created_at), "dd/MM h:mm a")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewingRecord(row)} title="View / Reprint">
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" disabled title="Editing not implemented in this demo">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => {
                              setRecordToDelete(row);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View / Print Modal */}
      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <DialogTitle>View Gate Pass: {viewingRecord?.gate_pass_no}</DialogTitle>
            <Button onClick={() => handlePrint()}><Printer className="mr-2 h-4 w-4" /> Reprint</Button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-50/50 relative">
            {viewingRecord && (
              <div className="border bg-white rounded-md p-8 text-black gate-pass-container shadow-sm mx-auto min-w-[800px] max-w-[900px]" ref={printRef}>
        
                <div className="text-center mb-6 pt-4">
                  {companyLogo && (
                    <div className="flex justify-center mb-4">
                      <img src={companyLogo} alt="Company Logo" className="h-16 object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <h2 className="text-xl sm:text-2xl font-bold uppercase">{companySettings?.company_name || 'Stretchline (Private) Limited - Mount Lavinia'}</h2>
                  <p className="text-sm">{companySettings?.business_address}</p>
                  {companySettings?.registered_address && <p className="text-sm">{companySettings.registered_address}</p>}
                  <p className="text-sm">{companySettings?.contact_line}</p>
                  <div className="mt-4 py-2 border-y-2 border-black font-bold text-lg text-center tracking-widest">
                    CONTROLLED BY COMMERCIAL & LOGISTICS DEPARTMENT
                  </div>
                  <h3 className="mt-4 text-xl font-bold uppercase underline">GATE PASS</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6 text-sm">
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Gate Pass No :</span>
                    <span className="font-bold">{viewingRecord.gate_pass_no}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Vehicle No :</span>
                    <span>{viewingRecord.vehicle_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Date :</span>
                    <span>{viewingRecord.date}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Driver Name :</span>
                    <span>{viewingRecord.driver_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Time :</span>
                    <span>{viewingRecord.time}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Phone No :</span>
                    <span>{viewingRecord.phone_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Location :</span>
                    <span>{viewingRecord.location}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold w-24 text-right">Driver NIC :</span>
                    <span>{viewingRecord.nic}</span>
                  </div>
                </div>

                <div className="mb-4 text-sm">
                  <span className="font-semibold">Customer:</span>
                  <span className="ml-2">{viewingRecord.customer_name}</span>
                </div>

                <table className="w-full text-sm border-collapse border border-black mb-6">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 w-10">NO</th>
                      <th className="border border-black p-2">Invoice</th>
                      <th className="border border-black p-2">DO</th>
                      <th className="border border-black p-2">MTRS</th>
                      <th className="border border-black p-2 w-24">CTN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingRecord.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                        <td className="border border-black p-2 font-medium">{row.invoice}</td>
                        <td className="border border-black p-2 text-center">{row.do}</td>
                        <td className="border border-black p-2 text-right">{(Number(row.mtrs) || 0).toLocaleString()}</td>
                        <td className="border border-black p-2 text-center">{row.cartons || 0}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="border border-black p-2 font-bold text-right">TOTAL</td>
                      <td className="border border-black p-2 font-bold text-right">{(Number(viewingRecord.total_mtrs) || 0).toLocaleString()}</td>
                      <td className="border border-black p-2 font-bold text-center">{viewingRecord.total_cartons}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-between items-center font-bold text-lg mb-16">
                  <div>TOTAL NUMBER OF CARTONS = <span className="border-b border-black inline-block w-16 text-center">{viewingRecord.total_cartons}</span></div>
                </div>

                <div className="grid grid-cols-3 gap-8 text-center mt-12 mb-8 animate-fade-in">
                  <div className="flex flex-col items-center justify-end h-24">
                    {signature && (
                      <img src={signature} alt="Authorized Signature" className="max-h-16 max-w-[150px] object-contain mb-1" referrerPolicy="no-referrer" />
                    )}
                    <div className="w-full border-t border-black pt-2 px-4 font-semibold">Authorized By</div>
                  </div>
                  <div className="flex flex-col items-center justify-end h-24">
                    <div className="w-full border-t border-black pt-2 px-4 font-semibold">Issued By</div>
                  </div>
                  <div className="flex flex-col items-center justify-end h-24">
                    <div className="w-full border-t border-black pt-2 px-4 font-semibold">Received By</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-12">
                  Created by: {viewingRecord.created_by} at {format(new Date(viewingRecord.created_at), "dd/MM/yyyy HH:mm:ss")}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Gate Pass {recordToDelete?.gate_pass_no}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
