import type { Metadata } from "next";

import { AuthenticatedAppFrame } from "@/components/layout/authenticated-app-frame";
import { noIndexMetadata } from "@/lib/site-config";

export const metadata: Metadata = noIndexMetadata;

export default AuthenticatedAppFrame;
