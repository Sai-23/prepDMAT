import type { Metadata } from "next";

import { NoIndexLayout } from "@/components/layout/no-index-layout";
import { noIndexMetadata } from "@/lib/site-config";

export const metadata: Metadata = noIndexMetadata;

export default NoIndexLayout;
