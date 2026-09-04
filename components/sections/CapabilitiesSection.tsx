"use client";

import { Section } from "@/components/ui/Section";
import { CapabilityList } from "@/components/capabilities/CapabilityList";

export function CapabilitiesSection() {
  return (
    <Section id="capabilities" title="Capabilities" eyebrow="What">
      <CapabilityList />
    </Section>
  );
}
