import type { Metadata } from "next";
import "./styles.css";
export const metadata:Metadata={title:"Friends Included Finance",description:"Transaction approvals and project finance"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
