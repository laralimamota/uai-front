import dayjs from "dayjs";
import { redirect } from "next/navigation";

export default function MesRedirectPage() {
  const today = dayjs();
  redirect(`/mes/${today.format("YYYY")}/${today.format("MM")}`);
}
