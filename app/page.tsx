import { StadiumMap } from "@/components/stadium-map"
import { LanguageProvider } from "@/lib/language-context"

export default function Home() {
  return (
    <LanguageProvider>
      <StadiumMap />
    </LanguageProvider>
  )
}
