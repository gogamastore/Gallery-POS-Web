"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Landmark, PlusCircle, Trash2, XCircle, FilePlus2, Lightbulb, Users, Package } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


interface CostCategory {
  id: string;
  name: string;
  icon: React.ElementType;
}

interface CostItem {
  id: string; // Will be a unique id for the cart item
  category: string;
  amount: number;
  description: string;
}

const operationalCostCategories: CostCategory[] = [
  { id: "supplies", name: "Pembelian Perlengkapan Usaha", icon: Package },
  { id: "electricity", name: "Pembayaran Listrik", icon: Lightbulb },
  { id: "salary", name: "Pembayaran Gaji Karyawan", icon: Users },
  { id: "misc", name: "Biaya Lain-lain", icon: FilePlus2 },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

function AddCostDialog({ category, onAddCost }: { category: CostCategory, onAddCost: (amount: number, description: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (amount <= 0) {
        // You can add a toast notification here
        return;
    }
    onAddCost(amount, description);
    setIsOpen(false);
    // Reset form
    setAmount(0);
    setDescription("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Biaya
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Biaya Operasional</DialogTitle>
          <DialogDescription>
            Masukkan detail untuk biaya: <strong>{category.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Total Harga
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Keterangan
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Contoh: Pembayaran listrik bulan Juli"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>Simpan Biaya</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OperationalCostsPage() {
  const [costCart, setCostCart] = useState<CostItem[]>([]);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);


  const handleAddCost = (categoryName: string, amount: number, description: string) => {
    setCostCart(prevCart => {
      const newItem: CostItem = {
        id: `${categoryName}-${new Date().getTime()}`, // simple unique id
        category: categoryName,
        amount,
        description,
      };
      return [...prevCart, newItem];
    });
     toast({
        title: "Biaya Ditambahkan",
        description: `Biaya untuk ${categoryName} telah ditambahkan ke rincian.`,
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCostCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const handleClearCart = () => {
    setCostCart([]);
  };

  const totalCost = useMemo(() => {
    return costCart.reduce((total, item) => total + item.amount, 0);
  }, [costCart]);
  
  const handleSaveTransaction = async () => {
    if (costCart.length === 0) {
        toast({ variant: "destructive", title: "Rincian Kosong", description: "Tidak ada biaya untuk disimpan." });
        return;
    }
    setIsProcessing(true);
    try {
        const promises = costCart.map(item => {
            return addDoc(collection(db, "operational_expenses"), {
                category: item.category,
                amount: item.amount,
                description: item.description,
                date: serverTimestamp(),
            });
        });
        
        await Promise.all(promises);

        toast({
            title: "Transaksi Berhasil",
            description: `${costCart.length} item biaya operasional telah berhasil disimpan.`,
        });

        setCostCart([]);

    } catch (error) {
         console.error("Error saving operational expenses: ", error);
         toast({
            variant: "destructive",
            title: "Gagal Menyimpan Biaya",
            description: "Terjadi kesalahan saat menyimpan data ke server.",
        });
    } finally {
        setIsProcessing(false);
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cost Categories List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Kategori Biaya Operasional</CardTitle>
            <CardDescription>Pilih kategori biaya untuk mencatat pengeluaran operasional baru.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kategori Biaya</TableHead>
                            <TableHead className="text-right w-[150px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {operationalCostCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                        <TableRow key={category.id}>
                            <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span>{category.name}</span>
                            </div>
                            </TableCell>
                            <TableCell className="text-right">
                            <AddCostDialog 
                                category={category}
                                onAddCost={(amount, description) => handleAddCost(category.name, amount, description)}
                            />
                            </TableCell>
                        </TableRow>
                        )
                    })}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Costs Cart */}
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Rincian Biaya</CardTitle>
                    <CardDescription>Daftar biaya yang akan dicatat.</CardDescription>
                </div>
                 <Button variant="ghost" size="icon" onClick={handleClearCart} disabled={costCart.length === 0}>
                    <XCircle className="h-5 w-5" />
                    <span className="sr-only">Kosongkan Daftar</span>
                 </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {costCart.length > 0 ? (
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {costCart.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.category}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {item.description}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(item.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFromCart(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center text-muted-foreground p-8">
                    <Landmark className="mx-auto h-12 w-12" />
                    <p className="mt-4">Belum ada biaya yang ditambahkan</p>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4 mt-4">
            <div className="flex justify-between font-bold text-lg">
                <span>Total Biaya</span>
                <span>{formatCurrency(totalCost)}</span>
            </div>
            <Button onClick={handleSaveTransaction} disabled={costCart.length === 0 || isProcessing}>
                {isProcessing ? "Menyimpan..." : "Simpan Transaksi Biaya"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
