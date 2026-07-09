import { useEffect, useState, useRef, DragEvent } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CompanySettings, Driver, Location, TimeSlot, Profile } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Save, Building2, UploadCloud, CheckCircle2, Eye, EyeOff, Edit2, Check, X } from "lucide-react";

interface FileUploaderProps {
  label: string;
  value: string | null;
  onChange: (base64: string | null) => void;
  id: string;
}

function FileUploader({ label, value, onChange, id }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = (e: any) => {
    // If we click on the Clear button, do not open file selector 
    if (e.target.closest('.clear-btn')) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</Label>
      {value ? (
        <div className="relative border rounded-lg p-4 bg-gray-50/25 dark:bg-slate-900/10 flex flex-col items-center justify-center space-y-2 h-44 group overflow-hidden">
          <img src={value} alt={label} className="max-h-32 object-contain rounded" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
            <Button size="sm" variant="secondary" onClick={handleClick}>Replace</Button>
            <Button size="sm" variant="destructive" className="clear-btn" onClick={() => onChange(null)}>Clear</Button>
          </div>
        </div>
      ) : (
        <div
          id={id}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer h-44 transition-all ${
            isDragging 
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/10 transition-colors"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag & drop image, or <span className="text-blue-600 dark:text-blue-500 hover:underline">browse</span></p>
          <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, JPEG up to 2MB</p>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}

function PasswordCell({ profile, onUpdate }: { profile: Profile, onUpdate: (id: string, newPass: string) => void }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.plain_password || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(profile.id, value);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input 
          type="text" 
          value={value} 
          onChange={(e) => setValue(e.target.value)} 
          className="h-7 w-28 text-xs font-mono px-2"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => { setEditing(false); setValue(profile.plain_password || ""); }} disabled={saving}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs select-all">
        {show ? (profile.plain_password || 'Not set') : '••••••••'}
      </span>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" onClick={() => setShow(!show)}>
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => setEditing(true)}>
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // New item states
  const [newDriver, setNewDriver] = useState({ driver_name: "", vehicle_number: "", phone_number: "", nic: "" });
  const [newLocation, setNewLocation] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState("");
  
  // New user states
  const [newUsername, setNewUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: cs },
        { data: drv },
        { data: loc },
        { data: ts },
        { data: prof }
      ] = await Promise.all([
        supabase.from('company_settings').select('*').limit(1).single(),
        supabase.from('drivers').select('*'),
        supabase.from('delivery_locations').select('*'),
        supabase.from('time_slots').select('*'),
        supabase.from('app_users').select('*')
      ]);

      if (cs) {
        if (!cs.logo_url) {
          cs.logo_url = localStorage.getItem('gate_pass_logo') || "";
        } else {
          localStorage.setItem('gate_pass_logo', cs.logo_url);
        }
        setCompanySettings(cs);
      }
      if (drv) setDrivers(drv);
      if (loc) setLocations(loc);
      if (ts) setTimeSlots(ts);
      if (prof) setProfiles(prof);

      const savedSig = localStorage.getItem('gate_pass_signature');
      if (savedSig) {
        setSignature(savedSig);
      } else {
        setSignature("https://lmwaeuhbgvaioflvymvi.supabase.co/storage/v1/object/sign/Logo/Logo%20Dilhani.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZjQ0OThhYS01MDQzLTQzYWItODFmMS0zZWVlZTg3YWE5ZmIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvL0xvZ28gRGlsaGFuaS5wbmciLCJpYXQiOjE3ODA2NDg5NTcsImV4cCI6NDkzNDI0ODk1N30.4tGgcXz3IZ4jsuuOD-zSkkl5BcsoHdBbhI5TX8nHFvk");
      }
    } catch (err: any) {
      toast.error(`Error loading settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCompanyInfo = async () => {
    if (!companySettings) return;
    try {
      // 1. Try to save logo_url to Supabase table company_settings
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: companySettings.company_name,
          business_address: companySettings.business_address,
          registered_address: companySettings.registered_address,
          contact_line: companySettings.contact_line,
          logo_url: companySettings.logo_url
        })
        .eq('id', companySettings.id);

      if (error) {
        console.warn("Could not save to Supabase company_settings:", error);
      }
      
      // 2. Save both consistently to localStorage so they are guaranteed to work instantly
      if (companySettings.logo_url) {
        localStorage.setItem('gate_pass_logo', companySettings.logo_url);
      } else {
        localStorage.removeItem('gate_pass_logo');
      }

      if (signature) {
        localStorage.setItem('gate_pass_signature', signature);
      } else {
        localStorage.removeItem('gate_pass_signature');
      }

      toast.success("Company information and signature saved successfully.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.driver_name || !newDriver.vehicle_number) return;
    try {
      const { error, data } = await supabase.from('drivers').insert([newDriver]).select();
      if (error) throw error;
      if (data) setDrivers([...drivers, data[0]]);
      setNewDriver({ driver_name: "", vehicle_number: "", phone_number: "", nic: "" });
      toast.success("Driver added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      await supabase.from('drivers').delete().eq('id', id);
      setDrivers(drivers.filter(d => d.id !== id));
      toast.success("Driver deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation) return;
    try {
      const { error, data } = await supabase.from('delivery_locations').insert([{ location_name: newLocation }]).select();
      if (error) throw error;
      if (data) setLocations([...locations, data[0]]);
      setNewLocation("");
      toast.success("Location added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await supabase.from('delivery_locations').delete().eq('id', id);
      setLocations(locations.filter(d => d.id !== id));
      toast.success("Location deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddTimeSlot = async () => {
    if (!newTimeSlot) return;
    try {
      const { error, data } = await supabase.from('time_slots').insert([{ label: newTimeSlot }]).select();
      if (error) throw error;
      if (data) setTimeSlots([...timeSlots, data[0]]);
      setNewTimeSlot("");
      toast.success("Time slot added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTimeSlot = async (id: string) => {
    try {
      await supabase.from('time_slots').delete().eq('id', id);
      setTimeSlots(timeSlots.filter(d => d.id !== id));
      toast.success("Time slot deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newUserPassword) {
      toast.error("Username and Password are required");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          email: newUserEmail.trim() || null,
          plain_password: newUserPassword,
          username: newUsername,
          role: newUserRole,
          is_active: true
        })
        .select();

      if (error) throw error;
      
      toast.success("User created successfully.");
      setNewUsername("");
      setNewUserEmail("");
      setNewUserPassword("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) throw error;
      setProfiles(profiles.filter(p => p.id !== id));
      toast.success("User deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleUpdatePassword = async (id: string, newPass: string) => {
    try {
      const { error } = await supabase.from('app_users').update({ plain_password: newPass }).eq('id', id);
      if (error) throw error;
      setProfiles(profiles.map(p => p.id === id ? { ...p, plain_password: newPass } : p));
      toast.success("Password updated in user records");
    } catch (err: any) {
      toast.error("Failed to update password: " + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-32"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="flex flex-col h-full flex-1 max-w-[1200px] mx-auto w-full space-y-8 pb-12">
      <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Manage configuration, users, and organization preferences.</p>
      </div>

      <Tabs defaultValue="company" className="flex flex-col md:flex-row gap-8 w-full" orientation="vertical">
        <TabsList className="flex flex-col h-auto w-full md:w-56 bg-transparent space-y-1.5 items-start justify-start p-0 flex-shrink-0">
          <TabsTrigger value="company" className="w-full justify-start py-2.5 px-3.5 text-sm font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            Organization Info
          </TabsTrigger>
          <TabsTrigger value="drivers" className="w-full justify-start py-2.5 px-3.5 text-sm font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            Drivers
          </TabsTrigger>
          <TabsTrigger value="locations" className="w-full justify-start py-2.5 px-3.5 text-sm font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            Locations
          </TabsTrigger>
          <TabsTrigger value="times" className="w-full justify-start py-2.5 px-3.5 text-sm font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            Time Slots
          </TabsTrigger>
          <TabsTrigger value="users" className="w-full justify-start py-2.5 px-3.5 text-sm font-medium rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-800 transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            System Users
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 w-full min-w-0">
        {/* Company Settings */}
        <TabsContent value="company" className="m-0 mt-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-lg">Organization Information</CardTitle>
              <CardDescription className="mt-1">Details configured here will appear on printed gate passes.</CardDescription>
            </div>
            <CardContent className="p-6 space-y-8">
              <div className="grid gap-6 max-w-2xl">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Organization Name</Label>
                  <Input 
                    value={companySettings?.company_name || ""}
                    onChange={e => setCompanySettings(prev => prev ? {...prev, company_name: e.target.value} : null)}
                    className="bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Business Address</Label>
                  <Input 
                    value={companySettings?.business_address || ""}
                    onChange={e => setCompanySettings(prev => prev ? {...prev, business_address: e.target.value} : null)}
                    className="bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Registered Address</Label>
                  <Input 
                    value={companySettings?.registered_address || ""}
                    onChange={e => setCompanySettings(prev => prev ? {...prev, registered_address: e.target.value} : null)}
                    className="bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Contact Details (Tel/Fax/Email)</Label>
                  <Input 
                    value={companySettings?.contact_line || ""}
                    onChange={e => setCompanySettings(prev => prev ? {...prev, contact_line: e.target.value} : null)}
                    className="bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <FileUploader
                  label="Company Logo"
                  value={companySettings?.logo_url || null}
                  onChange={(val) => setCompanySettings(prev => prev ? { ...prev, logo_url: val || "" } : null)}
                  id="logo-upload"
                />
                <FileUploader
                  label="Authorized Signature"
                  value={signature}
                  onChange={(val) => setSignature(val)}
                  id="signature-upload"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
              <Button onClick={handleSaveCompanyInfo} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                <Save className="mr-2 h-4 w-4" /> Save Organization Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Drivers */}
        <TabsContent value="drivers" className="m-0 mt-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-lg">Drivers Registry</CardTitle>
              <CardDescription className="mt-1">Manage approved drivers and their primary vehicles.</CardDescription>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-3 items-end mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">Driver Name</Label>
                  <Input className="h-9 bg-white dark:bg-slate-950" value={newDriver.driver_name} onChange={e => setNewDriver({...newDriver, driver_name: e.target.value})} placeholder="John Doe" />
                </div>
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">Vehicle No</Label>
                  <Input className="h-9 bg-white dark:bg-slate-950 uppercase" value={newDriver.vehicle_number} onChange={e => setNewDriver({...newDriver, vehicle_number: e.target.value})} placeholder="ABC-1234" />
                </div>
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">Phone No</Label>
                  <Input className="h-9 bg-white dark:bg-slate-950" value={newDriver.phone_number} onChange={e => setNewDriver({...newDriver, phone_number: e.target.value})} placeholder="071..." />
                </div>
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">NIC</Label>
                  <Input className="h-9 bg-white dark:bg-slate-950" value={newDriver.nic} onChange={e => setNewDriver({...newDriver, nic: e.target.value})} placeholder="NIC number" />
                </div>
                <Button onClick={handleAddDriver} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 h-9 w-full md:w-auto mt-2 md:mt-0">
                  <Plus className="mr-2 h-4 w-4" /> Add Driver
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Driver Name</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Vehicle No</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Phone</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">NIC</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">No drivers added yet</TableCell>
                      </TableRow>
                    ) : (
                    drivers.map(d => (
                      <TableRow key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium">{d.driver_name}</TableCell>
                        <TableCell><span className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide">{d.vehicle_number}</span></TableCell>
                        <TableCell className="text-slate-500">{d.phone_number || "-"}</TableCell>
                        <TableCell className="text-slate-500">{d.nic || "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDriver(d.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations */}
        <TabsContent value="locations" className="m-0 mt-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-lg">Delivery Locations</CardTitle>
            </div>
            <CardContent className="p-6">
              <div className="flex gap-3 items-end mb-8 max-w-lg bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="grid gap-1.5 flex-1">
                  <Label className="text-xs text-slate-500">Location Name</Label>
                  <Input className="h-9 bg-white dark:bg-slate-950" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. MAS Holdings HQ" />
                </div>
                <Button onClick={handleAddLocation} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 h-9">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Location Details</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-500 py-8">No locations added yet</TableCell>
                      </TableRow>
                    ) : (
                    locations.map(d => (
                      <TableRow key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">{d.location_name}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteLocation(d.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Slots */}
        <TabsContent value="times" className="m-0 mt-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-lg">Allowed Time Slots</CardTitle>
            </div>
            <CardContent className="p-6">
              <div className="flex gap-3 items-end mb-8 max-w-lg bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="grid gap-1.5 flex-1">
                  <Label className="text-xs text-slate-500">Time Label</Label>
                  <Input className="h-9 bg-white dark:bg-slate-950" value={newTimeSlot} onChange={e => setNewTimeSlot(e.target.value)} placeholder="e.g. Morning Shift" />
                </div>
                <Button onClick={handleAddTimeSlot} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 h-9">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Shift Name</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-500 py-8">No time slots added yet</TableCell>
                      </TableRow>
                    ) : (
                    timeSlots.map(d => (
                      <TableRow key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">{d.label}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTimeSlot(d.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="m-0 mt-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-lg">System Users</CardTitle>
              <CardDescription className="mt-1">Create accounts and manage access rules.</CardDescription>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">Username *</Label>
                  <Input 
                    value={newUsername} 
                    onChange={e => setNewUsername(e.target.value)} 
                    placeholder="john_doe"
                    className="h-10 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">Email Address</Label>
                  <Input 
                    type="email"
                    value={newUserEmail} 
                    onChange={e => setNewUserEmail(e.target.value)} 
                    placeholder="Optional (johndoe@example.com)"
                    className="h-10 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="grid gap-1.5 flex-1 w-full">
                  <Label className="text-xs text-slate-500">Password *</Label>
                  <Input 
                    type="password"
                    value={newUserPassword} 
                    onChange={e => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 6 chars"
                    className="h-10 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="grid gap-1.5 w-full md:w-40">
                  <Label className="text-xs text-slate-500">Role</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button onClick={handleAddUser} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 h-10 w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Username</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Email</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Account Role</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Temp Password</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Status</TableHead>
                      <TableHead className="font-medium text-slate-600 dark:text-slate-400">Joined</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map(p => (
                      <TableRow key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium">{p.username}</TableCell>
                        <TableCell className="text-slate-500">{p.email || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${p.role === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 capitalize'}`}>
                            {p.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <PasswordCell profile={p} onUpdate={handleUpdatePassword} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{p.is_active ? 'Active' : 'Disabled'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{new Date(p.created_at || new Date()).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {p.username !== 'admin' && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(p.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
