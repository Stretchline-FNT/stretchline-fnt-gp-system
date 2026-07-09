import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PackageOpen, FileText, Truck, DollarSign, Layers } from "lucide-react";
import { subDays, parseISO, isAfter, isBefore, format } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardMetrics {
  totalMtrs: number;
  totalValue: number;
  totalDeliveries: number;
  totalInvoices: number;
  totalCartons: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMtrs: 0,
    totalValue: 0,
    totalDeliveries: 0,
    totalInvoices: 0,
    totalCartons: 0
  });

  const [dailyData, setDailyData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);

  // Calculate start of current month and today dynamically
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: format(firstDay, "yyyy-MM-dd"),
      end: format(now, "yyyy-MM-dd")
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [preset, setPreset] = useState("current-month");

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const now = new Date();
    if (value === "current-month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(format(firstDay, "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    } else if (value === "last-7-days") {
      setStartDate(format(subDays(now, 7), "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    } else if (value === "last-30-days") {
      setStartDate(format(subDays(now, 30), "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const { data: records, error } = await supabase
          .from("gate_pass_records")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (error) throw error;

        let mMtrs = 0;
        let mValue = 0;
        let mInvoices = 0;
        let mCartons = 0;

        const dailyMap = new Map<string, { date: string, deliveries: number, mtrs: number, value: number }>();
        const custMap = new Map<string, { name: string, count: number, mtrs: number, value: number, invoices: number }>();

        records.forEach(r => {
          mMtrs += Number(r.total_mtrs);
          mValue += Number(r.total_value);
          mCartons += Number(r.total_cartons);
          mInvoices += Number(r.invoice_count);

          // Daily groupings
          const dateStr = format(parseISO(r.created_at), "MMM dd");
          if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, { date: dateStr, deliveries: 0, mtrs: 0, value: 0 });
          }
          const day = dailyMap.get(dateStr)!;
          day.deliveries += 1;
          day.mtrs += Number(r.total_mtrs);
          day.value += Number(r.total_value);

          // Customer groupings
          const cust = r.customer_name;
          if (!custMap.has(cust)) {
            custMap.set(cust, { name: cust, count: 0, mtrs: 0, value: 0, invoices: 0 });
          }
          const c = custMap.get(cust)!;
          c.count += 1;
          c.mtrs += Number(r.total_mtrs);
          c.value += Number(r.total_value);
          c.invoices += Number(r.invoice_count);
        });

        setMetrics({
          totalMtrs: mMtrs,
          totalValue: mValue,
          totalDeliveries: records.length,
          totalInvoices: mInvoices,
          totalCartons: mCartons
        });

        setDailyData(Array.from(dailyMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setCustomerData(Array.from(custMap.values()).sort((a,b) => b.value - a.value));

      } catch (err: any) {
        toast.error(`Failed to load dashboard: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center text-center sm:text-left gap-4 sm:gap-8">
        <div className="w-full sm:w-auto flex flex-col items-center sm:items-start">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-slate-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Key performance metrics and insights
          </p>
        </div>
        
        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Range:</span>
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-background/80 dark:bg-slate-950 px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="current-month">Current Month</option>
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPreset("custom");
                setStartDate(e.target.value);
              }}
              className="h-8 rounded-md border border-input bg-background/80 dark:bg-slate-950 px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset("custom");
                setEndDate(e.target.value);
              }}
              className="h-8 rounded-md border border-input bg-background/80 dark:bg-slate-950 px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity (MTRS)</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(Number(metrics.totalMtrs) || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(Number(metrics.totalValue) || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gate Passes</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cartons</CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCartons}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Deliveries</CardTitle>
            <CardDescription>Number of gate passes issued per day</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="deliveries" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Value Trend</CardTitle>
            <CardDescription>Value of goods shipped ($)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>By shipped value segment</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             {customerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {customerData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
             ) : (
               <div className="text-muted-foreground text-sm">No data available</div>
             )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Top 5 Customers</CardTitle>
            <CardDescription>Customer summary metrics</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Customer Name</th>
                  <th className="px-6 py-3 font-medium text-right">Invoices</th>
                  <th className="px-6 py-3 font-medium text-right">Gate Passes</th>
                  <th className="px-6 py-3 font-medium text-right">MTRS</th>
                  <th className="px-6 py-3 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customerData.slice(0, 5).map((cust, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium truncate max-w-[200px]" title={cust.name}>{cust.name}</td>
                    <td className="px-6 py-4 text-right">{cust.invoices}</td>
                    <td className="px-6 py-4 text-right">{cust.count}</td>
                    <td className="px-6 py-4 text-right">{(Number(cust.mtrs) || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">${(Number(cust.value) || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {customerData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No customer data available in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
