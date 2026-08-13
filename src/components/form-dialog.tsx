"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FormDialogCloseContext = createContext<(() => void) | null>(null);

export function FormDialogCloseProvider({
  close,
  children,
}: {
  close: () => void;
  children: ReactNode;
}) {
  return (
    <FormDialogCloseContext.Provider value={close}>
      {children}
    </FormDialogCloseContext.Provider>
  );
}

// Forms inside a FormDialog call this instead of receiving a close
// callback as a prop — props crossing from the Server Component pages
// that render these dialogs can't carry functions, only the dialog's own
// client-side state can, so it's threaded through context instead.
export function useFormDialogClose(): () => void {
  const close = useContext(FormDialogCloseContext);
  return close ?? (() => {});
}

export function FormDialog({
  triggerLabel,
  triggerIcon,
  title,
  description,
  wide = false,
  children,
}: {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            {triggerIcon}
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent
        className={
          wide
            ? "max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-xl"
            : "max-h-[min(90vh,800px)] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <FormDialogCloseProvider close={close}>{children}</FormDialogCloseProvider>
      </DialogContent>
    </Dialog>
  );
}
