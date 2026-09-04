import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { Preloader } from "@/components/intro/Preloader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { ScrollHeroLayout } from "@/components/hero/ScrollHeroLayout";
import { NavTabs } from "@/components/nav/NavTabs";
import { SiteNav } from "@/components/nav/SiteNav";
import { AboutSection } from "@/components/sections/AboutSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { Cursor } from "@/components/ui/Cursor";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Preloader />
      <AmbientBackground />
      <ScrollHeroLayout>
        <main className="page-main">
          <AboutSection />
          <CapabilitiesSection />
          <ProjectsSection />
          <ContactSection />
        </main>
        <SiteFooter />
      </ScrollHeroLayout>
      <AudioPlayer />
      <NavTabs />
      <SiteNav />
      <Cursor />
    </>
  );
}
