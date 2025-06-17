import { SectionType } from "@shared/schema";

interface SectionNavProps {
  activeSection: SectionType;
  onSectionChange: (section: SectionType) => void;
  availableSections?: SectionType[];
}

export default function SectionNav({ 
  activeSection, 
  onSectionChange, 
  availableSections = ["riskTolerance"] 
}: SectionNavProps) {
  // Define section display names
  const sectionNames = {
    riskTolerance: "Risk Tolerance Questionnaire",
    clientUpdate: "Client Update",
    investmentPolicy: "Investment Policy Statement"
  };

  return (
    <div className="mb-8">
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          {availableSections.map(section => (
            <button
              key={section}
              onClick={() => onSectionChange(section)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === section
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {sectionNames[section]}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
