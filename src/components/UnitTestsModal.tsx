import React, { useState } from 'react';
import { runStrategyEngineTestSuite, TestCaseResult } from '../engine/engineTests';
import { X, CheckCircle2, XCircle, Play, FlaskConical } from 'lucide-react';

interface UnitTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnitTestsModal: React.FC<UnitTestsModalProps> = ({ isOpen, onClose }) => {
  const [testResults, setTestResults] = useState<TestCaseResult[]>(() => runStrategyEngineTestSuite());
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runStrategyEngineTestSuite();
      setTestResults(results);
      setIsRunning(false);
    }, 200);
  };

  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;
  const allPassed = passedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-neutral-100 text-sm">
                Strategy & Pricing Engine Verification Suite
              </h3>
              <p className="text-[11px] text-neutral-400">
                14 independent verification test cases mandated by product specification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-neutral-950/60 border-b border-neutral-800 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold ${
                allPassed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400'
              }`}
            >
              {passedCount} / {totalCount} PASSED
            </span>
            <span className="text-neutral-400">
              {allPassed ? 'All mathematical invariants verified' : 'Tests encountered failure'}
            </span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium transition-colors"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>{isRunning ? 'Running...' : 'Re-run All Tests'}</span>
          </button>
        </div>

        {/* Test List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-neutral-800/40">
          {testResults.map(test => (
            <div key={test.id} className="pt-2 first:pt-0 font-mono">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-bold text-neutral-200">{test.name}</span>
                  <span className="text-[10px] text-neutral-500">[{test.id}]</span>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    test.passed ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'
                  }`}
                >
                  {test.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <p className="text-[11px] text-neutral-400 ml-6 mt-0.5 font-sans">
                {test.description}
              </p>

              <div className="ml-6 mt-1 text-[10px] grid grid-cols-2 gap-2 text-neutral-500 bg-neutral-950/60 p-1.5 rounded border border-neutral-850">
                <div>
                  <span className="text-neutral-400">Expected: </span>
                  <span className="text-neutral-300">{test.expected}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Actual: </span>
                  <span className={test.passed ? 'text-emerald-400' : 'text-rose-400'}>{test.actual}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-lg transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
