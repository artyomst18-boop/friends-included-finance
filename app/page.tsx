import Dashboard from "./ui";
export default function Page(){return <Dashboard studentName={process.env.NEXT_PUBLIC_STUDENT_NAME??"Student name"} bot={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME??""} sheet={process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL??"#"} github={process.env.NEXT_PUBLIC_GITHUB_URL??"#"}/>}
