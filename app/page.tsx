import { Preloader } from "@/components/intro/Preloader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { ScrollHeroLayout } from "@/components/hero/ScrollHeroLayout";
import { SiteNav } from "@/components/nav/SiteNav";
import { AboutSection } from "@/components/sections/AboutSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { Cursor } from "@/components/ui/Cursor";

// Work comes straight after the hero: visitors look for proof first, then
// the skills behind it, then the person.
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Preloader />
      <AmbientBackground />
      <ScrollHeroLayout>
        <main className="page-main">
          <ProjectsSection />
          <CapabilitiesSection />
          <AboutSection />
          <ContactSection />
        </main>
        <SiteFooter />
      </ScrollHeroLayout>
      <SiteNav />
      <Cursor />
    </>
  );
}
