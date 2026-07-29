'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  ScaffoldAnalysisResponse,
  HelpTarget,
  VisualConnection,
  VisualEntity,
  VisualType,
} from '@/types/scaffold';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Home,
  Lightbulb,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';

type HelpStage = 'select' | 'level1' | 'level2' | 'level3' | 'complete';

const THINKING_ANSWERS_KEY = 'ai-step-thinking-answers';

const SUBJECT_LABEL_MAP: Record<string, string> = {
  korean: '국어',
  math: '수학',
  social: '사회',
  science: '과학',
  auto: '자동 (AI 분석)',
};

const SCOPE_LABEL_MAP: Record<string, string> = {
  word: '단어',
  phrase: '구절',
  sentence: '문장',
  paragraph: '문단',
  whole: '전체 내용',
};

const STEP_ITEMS = [
  { id: 'select', number: 0, label: '표현 선택' },
  { id: 'level1', number: 1, label: '상황 떠올리기' },
  { id: 'level2', number: 2, label: '쉬운 말로 보기' },
  { id: 'level3', number: 3, label: '생각 질문' },
] as const;

const VISUAL_TYPE_SET = new Set<VisualType>([
  'quantity',
  'sequence',
  'causeEffect',
  'inputProcessOutput',
  'comparison',
  'spatial',
  'conceptMap',
]);

const EXCLUDED_ENTITY_WORDS = /(개념도|다이어그램|시각화|그림|이미지)/i;
const GRADE_EXPRESSION = /(?:초등학교\s*)?\d+\s*학년/i;
const SUBJECT_EXPRESSION = /(?:^|\s)(?:국어|수학|사회|과학)(?:\s|$)/;

function isExcludedVisualizationValue(value: string): boolean {
  const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return (
    normalized.length === 0 ||
    GRADE_EXPRESSION.test(normalized) ||
    SUBJECT_EXPRESSION.test(normalized) ||
    EXCLUDED_ENTITY_WORDS.test(normalized)
  );
}

function getFilteredVisualData(
  entities: VisualEntity[] | undefined,
  connections: VisualConnection[] | undefined
) {
  const seenLabels = new Set<string>();
  const filteredEntities = (Array.isArray(entities) ? entities : []).filter((entity) => {
    if (!entity || isExcludedVisualizationValue(entity.label)) return false;
    const key = entity.label.normalize('NFKC').trim().toLocaleLowerCase();
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });
  const labels = new Set(filteredEntities.map((entity) => entity.label.trim()));
  const filteredConnections = (Array.isArray(connections) ? connections : []).filter(
    (connection) =>
      connection &&
      labels.has(connection.from.trim()) &&
      labels.has(connection.to.trim()) &&
      !isExcludedVisualizationValue(connection.label)
  );

  return { entities: filteredEntities, connections: filteredConnections };
}

function wrapSvgText(value: string, limit = 9): string[] {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= limit) line = `${line} ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);

  return lines.flatMap((item) => {
    if (item.length <= limit) return [item];
    return Array.from({ length: Math.ceil(item.length / limit) }, (_, index) =>
      item.slice(index * limit, (index + 1) * limit)
    );
  }).slice(0, 2);
}

type VisualPosition = { x: number; y: number };

function getVisualPositions(type: VisualType, entities: VisualEntity[]): VisualPosition[] {
  const count = entities.length;
  if (type === 'conceptMap') {
    return entities.map((_, index) => {
      if (index === 0) return { x: 360, y: 200 };
      const angle = ((index - 1) / Math.max(1, count - 1)) * Math.PI * 2 - Math.PI / 2;
      return { x: 360 + Math.cos(angle) * 245, y: 200 + Math.sin(angle) * 135 };
    });
  }
  if (type === 'quantity') {
    return entities.map((_, index) => ({
      x: 105 + (index % 4) * 170,
      y: 115 + Math.floor(index / 4) * 175,
    }));
  }
  if (type === 'comparison') {
    return entities.map((_, index) => ({
      x: index % 2 === 0 ? 180 : 540,
      y: 105 + Math.floor(index / 2) * 130,
    }));
  }
  if (type === 'spatial') {
    return entities.map((_, index) => ({
      x: 80 + (index * 560) / Math.max(1, count - 1),
      y: 205 + (index % 2) * 42,
    }));
  }
  if (type === 'inputProcessOutput') {
    return entities.map((_, index) => ({
      x: 80 + (index * 560) / Math.max(1, count - 1),
      y: 200,
    }));
  }
  if (type === 'causeEffect') {
    return entities.map((_, index) => ({
      x: 80 + (index * 560) / Math.max(1, count - 1),
      y: index === 0 || index === count - 1 ? 200 : 155 + (index % 2) * 90,
    }));
  }

  return entities.map((_, index) => ({
    x: 80 + (index * 560) / Math.max(1, count - 1),
    y: 200,
  }));
}

function orderVisualEntities(
  visualType: VisualType,
  entities: VisualEntity[],
  connections: VisualConnection[]
): VisualEntity[] {
  if (!['inputProcessOutput', 'causeEffect', 'sequence'].includes(visualType)) {
    return entities;
  }

  const inbound = new Map(entities.map((entity) => [entity.label.trim(), 0]));
  const outbound = new Map(entities.map((entity) => [entity.label.trim(), 0]));
  connections.forEach((connection) => {
    inbound.set(connection.to.trim(), (inbound.get(connection.to.trim()) || 0) + 1);
    outbound.set(connection.from.trim(), (outbound.get(connection.from.trim()) || 0) + 1);
  });

  return [...entities].sort((left, right) => {
    const rank = (entity: VisualEntity) => {
      const label = entity.label.trim();
      const inCount = inbound.get(label) || 0;
      const outCount = outbound.get(label) || 0;
      if (inCount === 0 && outCount > 0) return 0;
      if (inCount > 0 && outCount === 0) return 2;
      return 1;
    };
    return rank(left) - rank(right);
  });
}

function VisualDiagram({
  visualType,
  entities,
  connections,
}: {
  visualType: VisualType;
  entities: VisualEntity[];
  connections: VisualConnection[];
}) {
  const visibleEntities = orderVisualEntities(visualType, entities, connections).slice(0, 8);
  const positions = getVisualPositions(visualType, visibleEntities);
  const positionByLabel = new Map(
    visibleEntities.map((entity, index) => [entity.label.trim(), positions[index]])
  );
  const visibleConnections = connections.filter(
    (connection) =>
      positionByLabel.has(connection.from.trim()) &&
      positionByLabel.has(connection.to.trim())
  );

  return (
    <div className={`level-one-visual visual-${visualType}`}>
      <svg
        viewBox="0 0 720 400"
        role="img"
        aria-label={`${visualType} 형식으로 표현한 원문의 핵심 대상과 관계`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id={`arrow-${visualType}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="visual-arrow-head" />
          </marker>
        </defs>

        {visualType === 'spatial' && (
          <g className="spatial-scale" aria-hidden="true">
            <line x1="55" y1="310" x2="665" y2="310" />
            {[0, 1, 2, 3, 4, 5, 6].map((tick) => (
              <line key={tick} x1={55 + tick * 101.6} y1="302" x2={55 + tick * 101.6} y2="318" />
            ))}
          </g>
        )}

        {visibleConnections.map((connection, index) => {
          const from = positionByLabel.get(connection.from.trim());
          const to = positionByLabel.get(connection.to.trim());
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const inset = Math.min(66, length / 3);
          const x1 = from.x + (dx / length) * inset;
          const y1 = from.y + (dy / length) * inset;
          const x2 = to.x - (dx / length) * inset;
          const y2 = to.y - (dy / length) * inset;
          const labelX = (x1 + x2) / 2;
          const labelY = (y1 + y2) / 2 - 9;
          const label = wrapSvgText(connection.label, 10)[0] || connection.label;

          return (
            <g key={`${connection.from}-${connection.to}-${index}`} className="visual-connection">
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                markerEnd={`url(#arrow-${visualType})`}
              />
              <rect x={labelX - 43} y={labelY - 13} width="86" height="24" rx="12" />
              <text x={labelX} y={labelY + 4} textAnchor="middle">{label}</text>
            </g>
          );
        })}

        {visibleEntities.map((entity, index) => {
          const position = positions[index];
          const labelLines = wrapSvgText(entity.label);
          const isCenter = visualType === 'conceptMap' && index === 0;
          const icon = entity.iconHint?.trim().slice(0, 4) || '●';

          return (
            <g
              key={`${entity.label}-${index}`}
              transform={`translate(${position.x}, ${position.y})`}
              className={`visual-entity ${isCenter ? 'center' : ''}`}
            >
              <rect x="-63" y="-42" width="126" height="84" rx="22" />
              <text x="0" y="-13" textAnchor="middle" className="visual-entity-icon">{icon}</text>
              <text x="0" y="11" textAnchor="middle" className="visual-entity-label">
                {labelLines.map((line, lineIndex) => (
                  <tspan key={lineIndex} x="0" dy={lineIndex === 0 ? 0 : 17}>{line}</tspan>
                ))}
              </text>
              {visualType === 'quantity' && typeof entity.quantity === 'number' && (
                <g className="visual-quantity-group">
                  {Array.from({ length: Math.min(5, Math.max(0, Math.round(entity.quantity))) }, (_, dot) => (
                    <circle key={dot} cx={-20 + dot * 10} cy="31" r="3.5" />
                  ))}
                  <text x="48" y="-27" textAnchor="middle" className="visual-quantity">
                    {entity.quantity}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function VisualFallback({
  description,
  entities,
  connections,
  keyFacts,
  checkQuestion,
}: {
  description: string;
  entities: VisualEntity[];
  connections: VisualConnection[];
  keyFacts: string[];
  checkQuestion: string;
}) {
  return (
    <div className="visual-fallback" aria-label="시각화 데이터 요약">
      <div className="visual-fallback-section">
        <strong>상황 설명</strong>
        <p>{description}</p>
      </div>
      <div className="visual-fallback-section">
        <strong>핵심 대상</strong>
        <p>{entities.map((entity) => entity.label).join(', ') || '원문에서 핵심 대상을 찾아보세요.'}</p>
      </div>
      <div className="visual-fallback-section">
        <strong>실제 관계</strong>
        {connections.length > 0 ? (
          <ul>
            {connections.map((connection, index) => (
              <li key={index}>{connection.from} → {connection.label} → {connection.to}</li>
            ))}
          </ul>
        ) : (
          <p>원문에서 대상들이 어떻게 이어지는지 살펴보세요.</p>
        )}
      </div>
      <div className="visual-fallback-section">
        <strong>핵심 정보</strong>
        <ul>{keyFacts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>
      </div>
      <div className="visual-fallback-section">
        <strong>확인 질문</strong>
        <p>{checkQuestion}</p>
      </div>
    </div>
  );
}

export default function StudentResultPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [savedInput, setSavedInput] = useState('');
  const [savedSubject, setSavedSubject] = useState('auto');
  const [analysisResult, setAnalysisResult] = useState<ScaffoldAnalysisResponse | null>(null);
  const [isResultLoaded, setIsResultLoaded] = useState(false);
  const [currentStage, setCurrentStage] = useState<HelpStage>('select');
  const [checkedTargetIds, setCheckedTargetIds] = useState<Record<string, boolean>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [thinkingAnswers, setThinkingAnswers] = useState<Record<string, string>>({});
  const [showLevel4, setShowLevel4] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'student') {
        router.push('/admin');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const input = localStorage.getItem('ai-step-input') || '';
    const subject = localStorage.getItem('ai-step-subject') || 'auto';
    const storedResult = localStorage.getItem('ai-step-analysis-result');
    const storedAnswers = localStorage.getItem(THINKING_ANSWERS_KEY);

    setSavedInput(input);
    setSavedSubject(subject);

    if (storedResult) {
      try {
        setAnalysisResult(JSON.parse(storedResult));
      } catch (error) {
        console.error('Failed to parse analysis result from localStorage:', error);
      }
    }

    if (storedAnswers) {
      try {
        setThinkingAnswers(JSON.parse(storedAnswers));
      } catch (error) {
        console.error('Failed to parse thinking answers from localStorage:', error);
      }
    }

    setIsResultLoaded(true);
  }, []);

  const selectedTargets = useMemo(() => {
    if (!analysisResult) return [];

    return analysisResult.helpTargets.filter((target, index) => {
      const targetId = target.id || `target-${index}`;
      return checkedTargetIds[targetId];
    });
  }, [analysisResult, checkedTargetIds]);

  const thinkingQuestions = useMemo(() => {
    if (!analysisResult?.level3Preview.question) return [];
    return [analysisResult.level3Preview.question];
  }, [analysisResult]);

  const subjectDisplay = analysisResult?.subject
    ? SUBJECT_LABEL_MAP[analysisResult.subject] || analysisResult.subject
    : SUBJECT_LABEL_MAP[savedSubject] || savedSubject;

  const currentQuestion = thinkingQuestions[questionIndex] || '';
  const currentAnswerKey = `question-${questionIndex}`;
  const currentStepIndex = STEP_ITEMS.findIndex((item) => item.id === currentStage);
  const rawLevel1 = analysisResult?.level1Preview;
  const visualType: VisualType =
    rawLevel1?.visualType && VISUAL_TYPE_SET.has(rawLevel1.visualType)
      ? rawLevel1.visualType
      : 'conceptMap';
  const visualData = getFilteredVisualData(rawLevel1?.entities, rawLevel1?.connections);
  const level1KeyFacts =
    rawLevel1?.keyFacts?.length
      ? rawLevel1.keyFacts
      : analysisResult?.wholeTextHelp.importantInformation || [];
  const level1CheckQuestion =
    rawLevel1?.checkQuestion?.trim() ||
    analysisResult?.level3Preview.question?.trim() ||
    '원문에서 핵심 대상들이 서로 어떤 관계를 맺고 있는지 말해 보세요.';
  const hasDiagramData = visualData.entities.length >= 2 && visualData.connections.length >= 1;

  const toggleTargetCheck = (id: string) => {
    setCheckedTargetIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const saveThinkingAnswer = (value: string) => {
    setThinkingAnswers((prev) => {
      const next = {
        ...prev,
        [currentAnswerKey]: value,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(THINKING_ANSWERS_KEY, JSON.stringify(next));
      }

      return next;
    });
  };

  const handleEditInput = () => {
    router.push('/student/input');
  };

  const handleGoHome = () => {
    router.push('/student');
  };

  if (loading || !user || user.role !== 'student') {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>화면을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!isResultLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>분석 결과를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="result-page-container">
            <div className="result-empty-state">
              <Sparkles size={40} className="title-icon" />
              <h1>단계별 도움을 준비하고 있어요</h1>
              <p>
                현재 AI 분석 결과가 없습니다. 입력 화면에서 분석을 완료하면 단계별 도움을 볼 수 있습니다.
              </p>
              <div className="result-empty-actions">
                <button type="button" className="stage-primary-btn" onClick={handleEditInput}>
                  입력 화면으로 가기
                  <ArrowRight size={20} />
                </button>
                <button type="button" className="stage-secondary-btn" onClick={handleGoHome}>
                  <Home size={20} />
                  홈으로 돌아가기
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const renderSelectedTargetChips = () => (
    <div className="selected-target-summary">
      <span className="selected-target-label">내가 고른 도움</span>
      <div className="selected-target-chips">
        {selectedTargets.map((target, index) => (
          <span className="selected-target-chip" key={target.id || `selected-${index}`}>
            {target.text}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <div className="result-page-container staged-help-page">
          <header className="result-page-header">
            <span className="card-badge">{subjectDisplay}</span>
            <h1 className="result-page-title">
              <Sparkles size={28} className="title-icon" />
              단계별 도움
            </h1>
            <p className="result-page-subtitle">
              필요한 표현을 고르고, 한 단계씩 천천히 살펴보세요.
            </p>
          </header>

          {currentStage !== 'complete' && (
            <nav className="stage-progress" aria-label="도움 단계">
              {STEP_ITEMS.map((item, index) => {
                const isActive = item.id === currentStage;
                const isDone = currentStepIndex > index;

                return (
                  <div
                    className={`stage-progress-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    key={item.id}
                  >
                    <span className="stage-progress-number">
                      {isDone ? <CheckCircle2 size={18} /> : item.number}
                    </span>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </nav>
          )}

          {currentStage === 'select' && (
            <section className="result-card stage-card" aria-labelledby="select-help-title">
              <div className="stage-card-heading">
                <span className="stage-number-badge">준비</span>
                <div>
                  <h2 id="select-help-title">도움받을 표현 선택</h2>
                  <p>어려운 단어나 문장을 여러 개 골라도 괜찮아요.</p>
                </div>
              </div>

              <div className="original-text-compact">
                <span>입력한 원문</span>
                <p>{analysisResult.originalText || savedInput}</p>
              </div>

              {analysisResult.helpTargets.length === 0 ? (
                <p className="empty-section-text">추천된 어려운 표현이 없습니다.</p>
              ) : (
                <div className="help-targets-list selection-list">
                  {analysisResult.helpTargets.map((target: HelpTarget, index: number) => {
                    const targetId = target.id || `target-${index}`;
                    const isChecked = !!checkedTargetIds[targetId];

                    return (
                      <div
                        key={targetId}
                        className={`help-target-item ${isChecked ? 'checked' : ''}`}
                      >
                        <button
                          type="button"
                          className="target-checkbox-btn"
                          onClick={() => toggleTargetCheck(targetId)}
                          aria-pressed={isChecked}
                        >
                          {isChecked ? (
                            <CheckSquare size={24} className="checkbox-icon checked" />
                          ) : (
                            <Square size={24} className="checkbox-icon" />
                          )}
                          <span className="target-scope-tag">
                            {SCOPE_LABEL_MAP[target.scope] || target.scope}
                          </span>
                          <span className="target-text">{target.text}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="stage-action-row">
                <span className="selection-count">
                  {selectedTargets.length > 0
                    ? `${selectedTargets.length}개를 선택했어요.`
                    : '도움받을 표현을 한 개 이상 선택해 주세요.'}
                </span>
                <button
                  type="button"
                  className="stage-primary-btn"
                  onClick={() => setCurrentStage('level1')}
                  disabled={selectedTargets.length === 0}
                >
                  1단계 도움 보기
                  <ArrowRight size={20} />
                </button>
              </div>
            </section>
          )}

          {currentStage === 'level1' && (
            <section className="result-card stage-card stage-one" aria-labelledby="level-one-title">
              <div className="stage-card-heading">
                <span className="stage-number-badge">1</span>
                <div>
                  <h2 id="level-one-title">1단계 도움</h2>
                  <p>그림이나 상황을 머릿속에 천천히 떠올려 보세요.</p>
                </div>
              </div>

              {renderSelectedTargetChips()}

              <div className="stage-info-panel">
                <span className="stage-content-label">상황 설명</span>
                <p>{analysisResult.level1Preview.description}</p>
              </div>

              {hasDiagramData ? (
                <VisualDiagram
                  visualType={visualType}
                  entities={visualData.entities}
                  connections={visualData.connections}
                />
              ) : (
                <VisualFallback
                  description={analysisResult.level1Preview.description}
                  entities={visualData.entities}
                  connections={visualData.connections}
                  keyFacts={level1KeyFacts}
                  checkQuestion={level1CheckQuestion}
                />
              )}

              {hasDiagramData && visualData.entities.length > 0 && (
                <div className="stage-info-panel">
                  <span className="stage-content-label">핵심 대상</span>
                  <div className="visual-entity-chips">
                    {visualData.entities.map((entity, index) => (
                      <span key={`${entity.label}-${index}`}>{entity.iconHint} {entity.label}</span>
                    ))}
                  </div>
                </div>
              )}

              {hasDiagramData && visualData.connections.length > 0 && (
                <div className="stage-info-panel">
                  <span className="stage-content-label">실제 관계</span>
                  <ul className="stage-information-list">
                    {visualData.connections.map((connection, index) => (
                      <li key={index}>
                        {connection.from} → <strong>{connection.label}</strong> → {connection.to}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasDiagramData && level1KeyFacts.length > 0 && (
                <div className="stage-info-panel">
                  <span className="stage-content-label">핵심 정보</span>
                  <ul className="stage-information-list">
                    {level1KeyFacts.map((info, index) => (
                      <li key={index}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasDiagramData && (
                <div className="short-check-question">
                  <Lightbulb size={22} />
                  <div>
                    <span>잠깐 확인해 볼까요?</span>
                    <p>{level1CheckQuestion}</p>
                  </div>
                </div>
              )}

              <div className="stage-action-row split">
                <button
                  type="button"
                  className="stage-secondary-btn"
                  onClick={() => setCurrentStage('select')}
                >
                  <ArrowLeft size={20} />
                  표현 다시 고르기
                </button>
                <button
                  type="button"
                  className="stage-primary-btn"
                  onClick={() => setCurrentStage('level2')}
                >
                  2단계 도움
                  <ArrowRight size={20} />
                </button>
              </div>
            </section>
          )}

          {currentStage === 'level2' && (
            <section className="result-card stage-card stage-two" aria-labelledby="level-two-title">
              <div className="stage-card-heading">
                <span className="stage-number-badge">2</span>
                <div>
                  <h2 id="level-two-title">2단계 도움</h2>
                  <p>고른 표현을 쉬운 말과 짧은 덩어리로 나누어 살펴보세요.</p>
                </div>
              </div>

              {renderSelectedTargetChips()}

              <div className="stage-two-sections">
                <div className="stage-info-panel">
                  <span className="stage-content-label">쉬운 뜻</span>
                  <div className="meaning-cards">
                    {selectedTargets.map((target, index) => (
                      <div className="meaning-card" key={target.id || `meaning-${index}`}>
                        <strong>{target.text}</strong>
                        <p>{target.simpleMeaning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {analysisResult.level2Preview.chunks.length > 0 && (
                  <div className="stage-info-panel">
                    <span className="stage-content-label">문장 끊어 읽기</span>
                    <div className="chunk-pills">
                      {analysisResult.level2Preview.chunks.map((chunk, index) => (
                        <span className="chunk-pill" key={index}>{chunk}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.level2Preview.easyRewrite.length > 0 && (
                  <div className="stage-info-panel">
                    <span className="stage-content-label">쉬운 문장으로 다시 쓰기</span>
                    <ul className="stage-information-list">
                      {analysisResult.level2Preview.easyRewrite.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(analysisResult.wholeTextHelp.target || analysisResult.wholeTextHelp.situation) && (
                  <div className="stage-info-panel">
                    <span className="stage-content-label">누가 무엇을 하는지</span>
                    {analysisResult.wholeTextHelp.target && (
                      <p><strong>중심 대상:</strong> {analysisResult.wholeTextHelp.target}</p>
                    )}
                    {analysisResult.wholeTextHelp.situation && (
                      <p><strong>상황:</strong> {analysisResult.wholeTextHelp.situation}</p>
                    )}
                  </div>
                )}
              </div>

              <button type="button" className="read-aloud-btn" disabled>
                <Volume2 size={20} />
                읽어주기 · 준비 중
              </button>

              <div className="stage-action-row split">
                <button
                  type="button"
                  className="stage-secondary-btn"
                  onClick={() => setCurrentStage('level1')}
                >
                  <ArrowLeft size={20} />
                  1단계로
                </button>
                <button
                  type="button"
                  className="stage-primary-btn"
                  onClick={() => setCurrentStage('level3')}
                >
                  3단계 생각 질문
                  <ArrowRight size={20} />
                </button>
              </div>
            </section>
          )}

          {currentStage === 'level3' && (
            <section className="result-card stage-card stage-three" aria-labelledby="level-three-title">
              <div className="stage-card-heading">
                <span className="stage-number-badge">3</span>
                <div>
                  <h2 id="level-three-title">3단계 생각 질문</h2>
                  <p>정답을 찾기 전에, 핵심 관계를 내 말로 적어 보세요.</p>
                </div>
              </div>

              {renderSelectedTargetChips()}

              <div className="thinking-question-card">
                <span className="question-counter">
                  질문 {Math.min(questionIndex + 1, thinkingQuestions.length)} / {thinkingQuestions.length}
                </span>
                <p>{currentQuestion}</p>
              </div>

              <div className="question-navigation">
                <button
                  type="button"
                  className="question-nav-btn"
                  onClick={() => setQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={questionIndex === 0}
                >
                  <ChevronLeft size={20} />
                  이전 질문
                </button>
                <button
                  type="button"
                  className="question-nav-btn"
                  onClick={() => setQuestionIndex((prev) => Math.min(thinkingQuestions.length - 1, prev + 1))}
                  disabled={questionIndex >= thinkingQuestions.length - 1}
                >
                  다음 질문
                  <ChevronRight size={20} />
                </button>
              </div>

              <label className="thinking-answer-field">
                <span>내 생각을 짧게 적어 보세요</span>
                <textarea
                  rows={4}
                  value={thinkingAnswers[currentAnswerKey] || ''}
                  onChange={(event) => saveThinkingAnswer(event.target.value)}
                  placeholder="정답이 아니어도 괜찮아요. 떠오른 생각을 적어 보세요."
                />
                <small>작성한 내용은 이 기기에 자동으로 저장됩니다.</small>
              </label>

              <div className="stage-action-row split">
                <button
                  type="button"
                  className="stage-secondary-btn"
                  onClick={() => setCurrentStage('level2')}
                >
                  <ArrowLeft size={20} />
                  2단계로
                </button>
                <button
                  type="button"
                  className="understood-btn"
                  onClick={() => setCurrentStage('complete')}
                >
                  <CheckCircle2 size={22} />
                  이제 이해했어요
                </button>
              </div>
            </section>
          )}

          {currentStage === 'complete' && (
            <section className="result-card completion-card" aria-labelledby="complete-title">
              <div className="completion-icon">
                <CheckCircle2 size={52} />
              </div>
              <span className="completion-eyebrow">도움 단계 완료</span>
              <h2 id="complete-title">스스로 생각할 준비가 되었어요!</h2>
              <p>좋아요! 이제 원래 문제나 글로 돌아가 다시 해보세요.</p>

              <label className="level-four-toggle">
                <input
                  type="checkbox"
                  checked={showLevel4}
                  onChange={(event) => setShowLevel4(event.target.checked)}
                />
                <span>
                  <strong>4단계(선택): 더 생각해보기</strong>
                  <small>비슷한 상황에 적용해 보고 싶을 때 선택하세요.</small>
                </span>
              </label>

              {showLevel4 && (
                <div className="level-four-card">
                  <span className="stage-number-badge">4</span>
                  <div>
                    <h3>더 생각해보기</h3>
                    <p>
                      {analysisResult.wholeTextHelp.topic
                        ? `“${analysisResult.wholeTextHelp.topic}”과 비슷한 다른 상황을 떠올려 보세요. 무엇이 같고 무엇이 다른가요?`
                        : '비슷한 다른 상황을 떠올려 보세요. 무엇이 같고 무엇이 다른가요?'}
                    </p>
                    <span className="no-answer-note">정답을 보지 않고 내 생각으로 비교해 보세요.</span>
                  </div>
                </div>
              )}

              <div className="completion-actions">
                <button type="button" className="stage-primary-btn" onClick={handleGoHome}>
                  <Home size={20} />
                  원래 학습으로 돌아가기
                </button>
                <button
                  type="button"
                  className="stage-secondary-btn"
                  onClick={() => {
                    setShowLevel4(false);
                    setCurrentStage('select');
                  }}
                >
                  <BookOpen size={20} />
                  도움 다시 보기
                </button>
              </div>
            </section>
          )}

          <div className="result-bottom-navigation">
            <button type="button" className="text-navigation-btn" onClick={handleEditInput}>
              <ArrowLeft size={18} />
              원문 수정
            </button>
            <button type="button" className="text-navigation-btn" onClick={handleGoHome}>
              <Home size={18} />
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
