'use client';

import { useState } from 'react';

const FAMILIES = [
  { id: 'AC', name: 'Access Control', controls: 30 },
  { id: 'AT', name: 'Awareness and Training', controls: 5 },
  { id: 'AU', name: 'Audit and Accountability', controls: 12 },
  { id: 'CM', name: 'Configuration Management', controls: 11 },
  { id: 'IA', name: 'Identification and Authentication', controls: 12 },
  { id: 'IR', name: 'Incident Response', controls: 8 },
  { id: 'MA', name: 'Maintenance', controls: 6 },
  { id: 'MP', name: 'Media Protection', controls: 9 },
  { id: 'PE', name: 'Physical Protection', controls: 6 },
  { id: 'PS', name: 'Personnel Security', controls: 5 },
  { id: 'RA', name: 'Risk Assessment', controls: 6 },
  { id: 'CA', name: 'Security Assessment', controls: 5 },
  { id: 'SC', name: 'System & Comms Protection', controls: 18 },
  { id: 'SI', name: 'System & Information Integrity', controls: 10 },
];

const RESPONSE_OPTIONS = [
  { value: 'yes_fully', label: 'Yes - Fully Implemented' },
  { value: 'yes_partially', label: 'Yes - Partially Implemented' },
  { value: 'no_planned', label: 'No - But Planned' },
  { value: 'no_not_started', label: 'No - Not Started' },
  { value: 'na', label: 'Not Applicable' },
];

export default function AssessmentPage() {
  const [selectedFamily, setSelectedFamily] = useState(FAMILIES[0]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">CMMC 2.0 Level 2 Gap Assessment</h1>
      <p className="text-gray-500 mb-6">Answer questions for each NIST SP 800-171 control family. Your C3PAO readiness score updates in real-time.</p>

      {/* Family Selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FAMILIES.map((fam) => (
          <button
            key={fam.id}
            onClick={() => setSelectedFamily(fam)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              selectedFamily.id === fam.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {fam.id} - {fam.name}
          </button>
        ))}
      </div>

      {/* Selected Family */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-1">{selectedFamily.name}</h2>
        <p className="text-sm text-gray-500 mb-6">{selectedFamily.controls} controls to assess</p>

        {/* Sample questions for the selected family */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => {
            const qId = `${selectedFamily.id}-${i}`;
            return (
              <div key={qId} className="border-b pb-4">
                <p className="font-medium mb-3">
                  {selectedFamily.id}-{i}: Control assessment question #{i} for {selectedFamily.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {RESPONSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setResponses({ ...responses, [qId]: opt.value })}
                      className={`px-3 py-1.5 rounded text-sm ${
                        responses[qId] === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Save & Continue
          </button>
          <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            Generate SSP
          </button>
        </div>
      </div>
    </div>
  );
}
