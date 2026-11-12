"use client";

import { Section } from "@/components/ui/Section";
import { CapabilityList } from "@/components/capabilities/CapabilityList";

export function CapabilitiesSection() {
  return (
    <Section id="skills" title="Skills" eyebrow="What">
      <CapabilityList />
    </Section>
  );
}
