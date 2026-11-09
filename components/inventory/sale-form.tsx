"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { SaleCart } from "./sale-cart";
import { useSaleCart } from "./sale-cart-store";
import { SaleCatalog } from "./sale-catalog";

export function SaleForm() {
  const data = useQuery(api.inventory.saleFormData, {});

  // Read the saved cart after mount so server and client agree on the markup.
  useEffect(() => {
    void useSaleCart.persist.rehydrate();
  }, []);

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin/inventory">Inventory</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin/inventory/sales">Sales</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Record sale</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-4">
            {data === undefined ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                    key={index}
                    className="h-52 rounded-xl"
                  />
                ))}
              </div>
            ) : data.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a product to the{" "}
                <Link href="/admin/inventory/products" className="underline">
                  catalogue
                </Link>{" "}
                before recording a sale.
              </p>
            ) : (
              <SaleCatalog products={data.products} />
            )}
          </div>
        </main>

        <aside className="flex min-w-0">
          {data === undefined ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : data.products.length === 0 ? null : (
            <SaleCart products={data.products} />
          )}
        </aside>
      </div>
    </div>
  );
}
