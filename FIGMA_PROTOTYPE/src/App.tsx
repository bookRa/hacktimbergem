import { useState } from 'react';
import { PanelShell } from './components/PanelShell';
import { BBox } from './components/BBox';
import { EntityTag } from './components/EntityTag';
import { ContextPicker } from './components/ContextPicker';
import { EntityMenu } from './components/EntityMenu';
import { InlineEntityForm } from './components/InlineEntityForm';
import { ChipsTray } from './components/ChipsTray';
import { OCRPicker } from './components/OCRPicker';

type FlowState = 
  | 'f1-a' | 'f1-b' | 'f1-c' | 'f1-d'  // Flow 1: Drag-to-create Symbol Instance
  | 'f2-a' | 'f2-b' | 'f2-c' | 'f2-d'  // Flow 2: Link scope to evidence
  | 'f3-a' | 'f3-b' | 'f3-c' | 'f3-d'; // Flow 3: OCR → Scope

interface ChipItem {
  id: string;
  label: string;
  type: string;
}

export default function App() {
  const [currentFlow, setCurrentFlow] = useState<FlowState>('f1-a');
  const [contextPickerOpen, setContextPickerOpen] = useState(false);
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [chipsTrayOpen, setChipsTrayOpen] = useState(false);
  const [ocrPickerOpen, setOcrPickerOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [chips, setChips] = useState<ChipItem[]>([]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 20; // Account for ruler
    const y = e.clientY - rect.top - 20;
    setMousePos({ x, y });

    // Flow 1-A: Show rubber band, then context picker
    if (currentFlow === 'f1-a') {
      setCurrentFlow('f1-b');
      setContextPickerOpen(true);
    }
  };

  const handleContextPickerSelect = (entityType: string) => {
    setContextPickerOpen(false);
    if (entityType === 'Symbol Instance') {
      setCurrentFlow('f1-c');
      setFormOpen(true);
    }
  };

  const handleFormSave = () => {
    setFormOpen(false);
    setCurrentFlow('f1-d');
  };

  const handleEntityMenuAction = (action: string) => {
    setEntityMenuOpen(false);
    if (action === 'link') {
      setCurrentFlow('f2-c');
      setChipsTrayOpen(true);
    }
  };

  const handleEntityClick = (entityId: string) => {
    if (currentFlow === 'f2-c') {
      // Add to chips
      setChips(prev => [
        ...prev,
        { id: entityId, label: `Entity_${entityId}`, type: 'Drawing' }
      ]);
    }
  };

  const handleChipsTrayFinish = () => {
    setChipsTrayOpen(false);
    setChips([]);
    setCurrentFlow('f2-d');
  };

  const handleCreateFromOCR = () => {
    setFormOpen(false);
    setOcrPickerOpen(true);
    setCurrentFlow('f3-b');
  };

  const handleOCRSelect = () => {
    setOcrPickerOpen(false);
    setFormOpen(true);
    setCurrentFlow('f3-c');
  };

  const renderCanvasContent = () => {
    switch (currentFlow) {
      case 'f1-a':
        return (
          <div className="absolute inset-0 cursor-crosshair">
            <div 
              className="absolute top-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <h2 className="heading mb-2">Flow F1 — Drag-to-create Symbol Instance</h2>
              <p className="caption">Click anywhere to start creating a bounding box</p>
            </div>
          </div>
        );

      case 'f1-b':
        return (
          <div className="absolute inset-0">
            {/* Rubber band rectangle */}
            <div
              className="absolute border-2 border-dashed"
              style={{
                left: mousePos.x,
                top: mousePos.y,
                width: 120,
                height: 80,
                borderColor: 'var(--timbergem-accent)',
                backgroundColor: 'rgba(124, 92, 252, 0.08)'
              }}
            />
            <ContextPicker
              open={contextPickerOpen}
              x={mousePos.x + 130}
              y={mousePos.y}
              onSelect={handleContextPickerSelect}
              onClose={() => setContextPickerOpen(false)}
            />
          </div>
        );

      case 'f1-c':
        return (
          <div className="absolute inset-0">
            <BBox
              x={mousePos.x}
              y={mousePos.y}
              width={120}
              height={80}
              variant="normal"
            />
            <InlineEntityForm
              variant="SymbolInstanceForm"
              open={formOpen}
              x={mousePos.x + 130}
              y={mousePos.y}
              onSave={handleFormSave}
              onCancel={() => setFormOpen(false)}
              onCreateFromOCR={handleCreateFromOCR}
            />
          </div>
        );

      case 'f1-d':
        return (
          <div className="absolute inset-0">
            <BBox
              x={mousePos.x}
              y={mousePos.y}
              width={120}
              height={80}
              variant="incomplete"
            >
              <EntityTag
                type="SymbolInst"
                id="SYM001"
                incomplete={true}
                className="absolute -top-6 left-0"
              />
            </BBox>
            <div 
              className="absolute bottom-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <p className="caption">Entity created with incomplete state (red dashed border)</p>
            </div>
          </div>
        );

      case 'f2-a':
        return (
          <div className="absolute inset-0">
            <div 
              className="absolute top-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <h2 className="heading mb-2">Flow F2 — Link scope to evidence</h2>
              <p className="caption">Right-click the blue scope below to open entity menu</p>
            </div>
            <BBox
              x={200}
              y={150}
              width={150}
              height={60}
              variant="selected"
              onClick={() => {
                setCurrentFlow('f2-b');
                setEntityMenuOpen(true);
                setMousePos({ x: 360, y: 150 });
              }}
            >
              <EntityTag
                type="Scope"
                id="SCP001"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <EntityMenu
              open={entityMenuOpen}
              kind="Scope"
              x={mousePos.x}
              y={mousePos.y}
              onAction={handleEntityMenuAction}
              onClose={() => setEntityMenuOpen(false)}
            />
          </div>
        );

      case 'f2-b':
        return (
          <div className="absolute inset-0">
            <BBox
              x={200}
              y={150}
              width={150}
              height={60}
              variant="selected"
            >
              <EntityTag
                type="Scope"
                id="SCP001"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <EntityMenu
              open={entityMenuOpen}
              kind="Scope"
              x={mousePos.x}
              y={mousePos.y}
              onAction={handleEntityMenuAction}
              onClose={() => setEntityMenuOpen(false)}
            />
          </div>
        );

      case 'f2-c':
        return (
          <div className="absolute inset-0">
            <ChipsTray
              open={chipsTrayOpen}
              chips={chips}
              onRemoveChip={(id) => setChips(prev => prev.filter(c => c.id !== id))}
              onFinish={handleChipsTrayFinish}
              onCancel={() => {
                setChipsTrayOpen(false);
                setChips([]);
                setCurrentFlow('f2-a');
              }}
            />
            <BBox
              x={200}
              y={150}
              width={150}
              height={60}
              variant="selected"
            >
              <EntityTag
                type="Scope"
                id="SCP001"
                className="absolute -top-6 left-0"
              />
            </BBox>
            {/* Other entities to link */}
            <BBox
              x={100}
              y={250}
              width={100}
              height={50}
              variant="normal"
              onClick={() => handleEntityClick('002')}
            >
              <EntityTag
                type="Drawing"
                id="DWG002"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <BBox
              x={300}
              y={250}
              width={80}
              height={40}
              variant="normal"
              onClick={() => handleEntityClick('003')}
            >
              <EntityTag
                type="Note"
                id="NOT003"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <div 
              className="absolute bottom-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <p className="caption">Click other entities to add them to the link. Then click Finish.</p>
            </div>
          </div>
        );

      case 'f2-d':
        return (
          <div className="absolute inset-0">
            <BBox
              x={200}
              y={150}
              width={150}
              height={60}
              variant="normal"
            >
              <EntityTag
                type="Scope"
                id="SCP001"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <BBox
              x={100}
              y={250}
              width={100}
              height={50}
              variant="normal"
            >
              <EntityTag
                type="Drawing"
                id="DWG002"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <BBox
              x={300}
              y={250}
              width={80}
              height={40}
              variant="normal"
            >
              <EntityTag
                type="Note"
                id="NOT003"
                className="absolute -top-6 left-0"
              />
            </BBox>
            {/* Link indicators */}
            <svg className="absolute inset-0 pointer-events-none">
              <line
                x1={275}
                y1={210}
                x2={150}
                y2={250}
                stroke="var(--timbergem-accent)"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <line
                x1={275}
                y1={210}
                x2={340}
                y2={250}
                stroke="var(--timbergem-accent)"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
            <div 
              className="absolute bottom-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <p className="caption">Links created (shown as dashed lines). Link mode deactivated.</p>
            </div>
          </div>
        );

      case 'f3-a':
        return (
          <div className="absolute inset-0">
            <div 
              className="absolute top-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <h2 className="heading mb-2">Flow F3 — OCR → Scope (Create from OCR)</h2>
              <p className="caption">Symbol Instance form is open. Click "Create from OCR" to proceed.</p>
            </div>
            <BBox
              x={200}
              y={150}
              width={120}
              height={80}
              variant="incomplete"
            >
              <EntityTag
                type="SymbolInst"
                id="SYM004"
                incomplete={true}
                className="absolute -top-6 left-0"
              />
            </BBox>
            <InlineEntityForm
              variant="SymbolInstanceForm"
              open={formOpen}
              x={330}
              y={150}
              onSave={() => setCurrentFlow('f3-d')}
              onCancel={() => setFormOpen(false)}
              onCreateFromOCR={handleCreateFromOCR}
            />
          </div>
        );

      case 'f3-b':
        return (
          <div className="absolute inset-0">
            <BBox
              x={200}
              y={150}
              width={120}
              height={80}
              variant="incomplete"
            >
              <EntityTag
                type="SymbolInst"
                id="SYM004"
                incomplete={true}
                className="absolute -top-6 left-0"
              />
            </BBox>
            <OCRPicker
              open={ocrPickerOpen}
              x={400}
              y={100}
              onSelect={handleOCRSelect}
              onClose={() => setOcrPickerOpen(false)}
            />
          </div>
        );

      case 'f3-c':
        return (
          <div className="absolute inset-0">
            <BBox
              x={200}
              y={150}
              width={120}
              height={80}
              variant="incomplete"
            >
              <EntityTag
                type="SymbolInst"
                id="SYM004"
                incomplete={true}
                className="absolute -top-6 left-0"
              />
            </BBox>
            <InlineEntityForm
              variant="SymbolInstanceForm"
              open={formOpen}
              x={330}
              y={150}
              onSave={() => {
                setFormOpen(false);
                setCurrentFlow('f3-d');
              }}
              onCancel={() => setFormOpen(false)}
            />
            <div 
              className="absolute bottom-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <p className="caption">OCR text selected and filled into form. Click Save to complete.</p>
            </div>
          </div>
        );

      case 'f3-d':
        return (
          <div className="absolute inset-0">
            <BBox
              x={200}
              y={150}
              width={120}
              height={80}
              variant="normal"
            >
              <EntityTag
                type="SymbolInst"
                id="SYM004"
                className="absolute -top-6 left-0"
              />
            </BBox>
            <div 
              className="absolute bottom-20 left-20 text-center p-4"
              style={{ color: 'var(--timbergem-muted)' }}
            >
              <p className="caption">Symbol Instance now complete (solid border). Scope created and linked.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[var(--timbergem-bg)]">
      <PanelShell>
        <div 
          className="absolute inset-0 cursor-crosshair"
          onClick={handleCanvasClick}
        >
          {renderCanvasContent()}
        </div>
        
        {/* Flow Navigation Control */}
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 p-2 rounded-lg border"
          style={{ 
            backgroundColor: 'var(--timbergem-panel-elevated)',
            borderColor: 'var(--timbergem-border)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow.startsWith('f1') ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-text)]'
              }`}
              style={{
                backgroundColor: currentFlow.startsWith('f1') ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f1-a');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F1-A
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f1-b' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f1-b' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f1-b');
                setContextPickerOpen(true);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F1-B
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f1-c' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f1-c' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f1-c');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(true);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F1-C
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f1-d' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f1-d' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f1-d');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F1-D
            </button>
          </div>
          
          <div 
            className="w-px h-6"
            style={{ backgroundColor: 'var(--timbergem-border)' }}
          />
          
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f2-a' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-text)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f2-a' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f2-a');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F2-A
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f2-b' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f2-b' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f2-b');
                setContextPickerOpen(false);
                setEntityMenuOpen(true);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
                setMousePos({ x: 360, y: 150 });
              }}
            >
              F2-B
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f2-c' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f2-c' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f2-c');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(true);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F2-C
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f2-d' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f2-d' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f2-d');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F2-D
            </button>
          </div>
          
          <div 
            className="w-px h-6"
            style={{ backgroundColor: 'var(--timbergem-border)' }}
          />
          
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f3-a' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-text)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f3-a' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f3-a');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(true);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F3-A
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f3-b' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f3-b' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f3-b');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(true);
                setChips([]);
              }}
            >
              F3-B
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f3-c' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f3-c' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f3-c');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(true);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F3-C
            </button>
            <button
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentFlow === 'f3-d' ? 'text-[var(--timbergem-accent-contrast)]' : 'text-[var(--timbergem-muted)]'
              }`}
              style={{
                backgroundColor: currentFlow === 'f3-d' ? 'var(--timbergem-accent)' : 'transparent'
              }}
              onClick={() => {
                setCurrentFlow('f3-d');
                setContextPickerOpen(false);
                setEntityMenuOpen(false);
                setFormOpen(false);
                setChipsTrayOpen(false);
                setOcrPickerOpen(false);
                setChips([]);
              }}
            >
              F3-D
            </button>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}