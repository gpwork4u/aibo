"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { createFirstApiKey, fetchBootstrapStatus } from "@/lib/api/bootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1, "請輸入名稱").max(100),
});

type FormValues = z.infer<typeof schema>;

export default function BootstrapPage() {
  const router = useRouter();
  const { apiKey, setApiKey, hydrated } = useApiKey();
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "預設 API Key" },
  });

  useEffect(() => {
    fetchBootstrapStatus()
      .then((s) => setBootstrapped(s.bootstrapped))
      .catch(() => setBootstrapped(false));
  }, []);

  useEffect(() => {
    if (hydrated && apiKey) {
      router.replace("/inbox");
    }
  }, [apiKey, hydrated, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await createFirstApiKey(values.name);
      setApiKey(result.key);
      setNewKey(result.key);
      toast.success("API Key 已建立");
    } catch (err) {
      const message = err instanceof Error ? err.message : "建立失敗";
      toast.error(`建立失敗：${message}`);
    }
  });

  const alreadyBootstrapped = bootstrapped === true && !apiKey;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md" data-testid="bootstrap-welcome">
        <CardHeader>
          <CardTitle>歡迎使用 aibo</CardTitle>
          <CardDescription>
            {alreadyBootstrapped
              ? "系統已初始化。請使用既有的 API Key 登入，或聯絡管理員。"
              : "這是你第一次使用 aibo。請建立第一把 API Key 以開始使用。"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">API Key 名稱</Label>
              <Input
                id="name"
                placeholder="例如：預設 API Key"
                disabled={alreadyBootstrapped || form.formState.isSubmitting}
                data-testid="bootstrap-name-input"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            {alreadyBootstrapped && (
              <div className="space-y-2">
                <Label htmlFor="existing-key">已有的 API Key</Label>
                <Input
                  id="existing-key"
                  type="password"
                  placeholder="貼上你的 API Key"
                  onChange={(e) => setApiKey(e.target.value || null)}
                />
                <p className="text-xs text-muted-foreground">
                  儲存至 localStorage，可隨時在「設定 › API Key」中管理。
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={alreadyBootstrapped || form.formState.isSubmitting}
              data-testid="bootstrap-submit"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              建立第一把 API Key
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog
        open={!!newKey}
        onOpenChange={(open) => {
          if (!open) {
            setNewKey(null);
            router.replace("/inbox");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key 已建立</DialogTitle>
            <DialogDescription>
              請妥善保管此 Key。為了安全考量，系統不會再次顯示。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted p-3 font-mono text-sm break-all" data-testid="bootstrap-created-key">
            {newKey}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (newKey) {
                  navigator.clipboard.writeText(newKey).catch(() => {});
                  toast.success("已複製到剪貼簿");
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              複製
            </Button>
            <Button
              data-testid="bootstrap-continue"
              onClick={() => {
                setNewKey(null);
                router.replace("/inbox");
              }}
            >
              繼續
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
