import {
    PricingCTA,
    PricingDetails,
    PricingGrid,
    PricingHeader,
    PricingMembership,
    SectionDivider,
} from "@/components/marketing";

export default function PricingPage() {
    return (
        <div className="pricing-page">
            <PricingHeader />
            <PricingGrid />
            <SectionDivider />
            <PricingMembership />
            <SectionDivider />
            <PricingDetails />
            <SectionDivider />
            <PricingCTA />
        </div>
    );
}