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
  const filteredEntities = (Array.isArray(entities) ? entities : [])
    .filter((entity) => {
      if (!entity || isExcludedVisualizationValue(entity.label)) return false;
      const key = entity.label.normalize('NFKC').trim().toLocaleLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    })
    .map((entity) => ({ ...entity, label: entity.label.trim() }));
  const normalizedEntities = filteredEntities.map((entity) => ({
    entity,
    reference: normalizeEntityReference(entity.label),
  }));
  const findEntity = (reference: string) => {
    const normalizedReference = normalizeEntityReference(reference);
    const exact = normalizedEntities.find((item) => item.reference === normalizedReference);
    if (exact) return exact.entity;
    return normalizedEntities
      .filter(
        (item) =>
          item.reference.length >= 2 &&
          normalizedReference.length >= 2 &&
          (item.reference.includes(normalizedReference) ||
            normalizedReference.includes(item.reference))
      )
      .sort((left, right) => right.reference.length - left.reference.length)[0]?.entity;
  };
  const filteredConnections = (Array.isArray(connections) ? connections : []).flatMap(
    (connection) => {
      if (!connection || isExcludedVisualizationValue(connection.label)) return [];
      const fromEntity = findEntity(connection.from);
      const toEntity = findEntity(connection.to);
      if (!fromEntity || !toEntity || fromEntity.label === toEntity.label) return [];
      return [{ ...connection, from: fromEntity.label.trim(), to: toEntity.label.trim() }];
    }
  );

  return { entities: filteredEntities, connections: filteredConnections };
}

function normalizeEntityReference(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, '')
    .replace(/[\s.,!?·:;'"“”‘’()[\]{}<>/_-]+/g, '')
    .replace(/(에게서|으로부터|에서는|에게|에서|으로|로|와|과|은|는|이|가|을|를|의|에)$/g, '');
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

type RoleCategory =
  | 'input'
  | 'process'
  | 'output'
  | 'subject'
  | 'start'
  | 'middle'
  | 'end'
  | 'group'
  | 'item'
  | 'compareA'
  | 'compareB'
  | 'center'
  | 'related'
  | 'unknown';

type VisualNode = {
  entity: VisualEntity;
  x: number;
  y: number;
  width: number;
  height: number;
  zone: 'left' | 'center' | 'right' | 'neutral';
  step?: number;
  emphasized?: boolean;
};

function normalizeRole(role: string): RoleCategory {
  const normalized = role.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
  const rolePatterns: Array<[RoleCategory, RegExp]> = [
    ['compareA', /(comparea|비교대상a|비교a|첫번째비교)/],
    ['compareB', /(compareb|비교대상b|비교b|두번째비교)/],
    ['input', /(input|입력|재료|원인|source|투입)/],
    ['output', /(output|결과|생성물|산출|result)/],
    ['process', /(process|과정|변화|행동|처리|작용)/],
    ['center', /(center|중심개념|핵심개념|중심)/],
    ['subject', /(subject|대상|인물|주체)/],
    ['start', /(start|시작|처음)/],
    ['middle', /(middle|중간)/],
    ['end', /(end|끝|마지막)/],
    ['group', /(group|묶음|그룹)/],
    ['item', /(item|수량대상|개별|항목)/],
    ['related', /(related|관련개념|관련)/],
  ];
  return rolePatterns.find(([, pattern]) => pattern.test(normalized))?.[0] || 'unknown';
}

function distributeVertically(count: number, top = 105, bottom = 355): number[] {
  if (count <= 1) return [(top + bottom) / 2];
  return Array.from({ length: count }, (_, index) => top + (index * (bottom - top)) / (count - 1));
}

function getGraphCounts(
  entities: VisualEntity[],
  connections: VisualConnection[]
) {
  const inbound = new Map(entities.map((entity) => [entity.label.trim(), 0]));
  const outbound = new Map(entities.map((entity) => [entity.label.trim(), 0]));
  connections.forEach((connection) => {
    inbound.set(connection.to.trim(), (inbound.get(connection.to.trim()) || 0) + 1);
    outbound.set(connection.from.trim(), (outbound.get(connection.from.trim()) || 0) + 1);
  });
  return { inbound, outbound };
}

function orderSequenceEntities(
  entities: VisualEntity[],
  connections: VisualConnection[]
): VisualEntity[] {
  const { inbound } = getGraphCounts(entities, connections);
  const byLabel = new Map(entities.map((entity) => [entity.label.trim(), entity]));
  const ordered: VisualEntity[] = [];
  let current =
    entities.find((entity) => normalizeRole(entity.role) === 'start') ||
    entities.find((entity) => (inbound.get(entity.label.trim()) || 0) === 0);
  const visited = new Set<string>();

  while (current && !visited.has(current.label)) {
    ordered.push(current);
    visited.add(current.label);
    const nextConnection = connections.find(
      (connection) => connection.from === current?.label && !visited.has(connection.to)
    );
    current = nextConnection ? byLabel.get(nextConnection.to) : undefined;
  }
  return [...ordered, ...entities.filter((entity) => !visited.has(entity.label))];
}

function buildVisualNodes(
  visualType: VisualType,
  entities: VisualEntity[],
  connections: VisualConnection[]
): VisualNode[] {
  const limited = entities.slice(0, 9);
  const { inbound, outbound } = getGraphCounts(limited, connections);
  const roleOf = (entity: VisualEntity) => normalizeRole(entity.role);
  const verticalColumns = (
    left: VisualEntity[],
    center: VisualEntity[],
    right: VisualEntity[]
  ) => {
    const makeColumn = (
      column: VisualEntity[],
      x: number,
      zone: VisualNode['zone'],
      emphasized = false
    ) =>
      column.map((entity, index) => ({
        entity,
        x,
        y: distributeVertically(column.length)[index],
        width: emphasized ? 166 : 132,
        height: emphasized ? 108 : 82,
        zone,
        emphasized,
      }));
    return [
      ...makeColumn(left, 125, 'left'),
      ...makeColumn(center, 360, 'center', true),
      ...makeColumn(right, 595, 'right'),
    ];
  };

  if (visualType === 'inputProcessOutput' || visualType === 'causeEffect') {
    const leftRoles =
      visualType === 'inputProcessOutput'
        ? new Set<RoleCategory>(['input', 'start'])
        : new Set<RoleCategory>(['input', 'start']);
    const centerRoles = new Set<RoleCategory>([
      'process',
      'middle',
      'center',
      'subject',
    ]);
    const rightRoles = new Set<RoleCategory>(['output', 'end']);
    const left: VisualEntity[] = [];
    const center: VisualEntity[] = [];
    const right: VisualEntity[] = [];

    limited.forEach((entity) => {
      const role = roleOf(entity);
      const inCount = inbound.get(entity.label) || 0;
      const outCount = outbound.get(entity.label) || 0;
      if (leftRoles.has(role) || (inCount === 0 && outCount > 0)) left.push(entity);
      else if (rightRoles.has(role) || (inCount > 0 && outCount === 0)) right.push(entity);
      else if (centerRoles.has(role) || (inCount > 0 && outCount > 0)) center.push(entity);
      else center.push(entity);
    });

    if (center.length === 0 && limited.length > 2) {
      const candidate = [...limited].sort(
        (a, b) =>
          (inbound.get(b.label) || 0) +
          (outbound.get(b.label) || 0) -
          (inbound.get(a.label) || 0) -
          (outbound.get(a.label) || 0)
      )[0];
      if (candidate) {
        [left, right].forEach((column) => {
          const index = column.indexOf(candidate);
          if (index >= 0) column.splice(index, 1);
        });
        center.push(candidate);
      }
    }
    return verticalColumns(left, center, right);
  }

  if (visualType === 'sequence') {
    const ordered = orderSequenceEntities(limited, connections);
    return ordered.map((entity, index) => ({
      entity,
      x: 80 + (index * 560) / Math.max(1, ordered.length - 1),
      y: 220,
      width: 122,
      height: 92,
      zone: index === 0 ? 'left' : index === ordered.length - 1 ? 'right' : 'center',
      step: index + 1,
      emphasized: roleOf(entity) === 'middle',
    }));
  }

  if (visualType === 'quantity') {
    return limited.map((entity, index) => ({
      entity,
      x: limited.length <= 3 ? 140 + index * 220 : 115 + (index % 3) * 245,
      y: limited.length <= 3 ? 220 : 125 + Math.floor(index / 3) * 155,
      width: 160,
      height: 128,
      zone:
        roleOf(entity) === 'group'
          ? 'right'
          : roleOf(entity) === 'item'
            ? 'left'
            : 'neutral',
    }));
  }

  if (visualType === 'comparison') {
    const ordered = [...limited].sort((a, b) => {
      const rank = (entity: VisualEntity) =>
        roleOf(entity) === 'compareA' ? 0 : roleOf(entity) === 'compareB' ? 1 : 2;
      return rank(a) - rank(b);
    });
    return ordered.map((entity, index) => ({
      entity,
      x: index % 2 === 0 ? 190 : 530,
      y: 135 + Math.floor(index / 2) * 145,
      width: 168,
      height: 96,
      zone: index % 2 === 0 ? 'left' : 'right',
      emphasized: index < 2,
    }));
  }

  if (visualType === 'spatial') {
    const numeric = limited.filter((entity) => typeof entity.quantity === 'number');
    const values = numeric.map((entity) => entity.quantity as number);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    return limited.map((entity, index) => {
      const role = entity.role.normalize('NFKC').toLocaleLowerCase();
      let x = 100 + (index * 520) / Math.max(1, limited.length - 1);
      let y = 225;
      if (typeof entity.quantity === 'number' && max > min) {
        x = 100 + ((entity.quantity - min) / (max - min)) * 520;
      }
      if (/(왼쪽|서쪽|left)/.test(role)) x = 120;
      if (/(오른쪽|동쪽|right)/.test(role)) x = 600;
      if (/(위|북쪽|상단|top|north)/.test(role)) y = 125;
      if (/(아래|남쪽|하단|bottom|south)/.test(role)) y = 320;
      return { entity, x, y, width: 126, height: 82, zone: 'neutral' };
    });
  }

  const center =
    limited.find((entity) => roleOf(entity) === 'center') ||
    [...limited].sort(
      (a, b) =>
        (inbound.get(b.label) || 0) +
        (outbound.get(b.label) || 0) -
        (inbound.get(a.label) || 0) -
        (outbound.get(a.label) || 0)
    )[0];
  if (!center) return [];
  const related = limited.filter((entity) => entity !== center);
  return [
    { entity: center, x: 360, y: 225, width: 174, height: 112, zone: 'center', emphasized: true },
    ...related.map((entity, index) => {
      const angle = (index / Math.max(1, related.length)) * Math.PI * 2 - Math.PI / 2;
      return {
        entity,
        x: 360 + Math.cos(angle) * 250,
        y: 225 + Math.sin(angle) * 145,
        width: 128,
        height: 80,
        zone: 'neutral' as const,
      };
    }),
  ];
}

function VisualDiagram({
  visualType,
  entities,
  connections,
  keyFacts,
}: {
  visualType: VisualType;
  entities: VisualEntity[];
  connections: VisualConnection[];
  keyFacts: string[];
}) {
  const nodes = buildVisualNodes(visualType, entities, connections);
  const nodeByLabel = new Map(nodes.map((node) => [node.entity.label, node]));
  const visibleConnections = connections.filter(
    (connection) => nodeByLabel.has(connection.from) && nodeByLabel.has(connection.to)
  );
  const arrowId = `arrow-${visualType}`;

  return (
    <div className={`level-one-visual visual-${visualType}`}>
      <svg
        viewBox="0 0 720 460"
        role="img"
        aria-label={`${visualType} 형식으로 표현한 원문의 핵심 대상과 관계`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="9"
            markerHeight="9"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="visual-arrow-head" />
          </marker>
        </defs>

        {(visualType === 'inputProcessOutput' || visualType === 'causeEffect') && (
          <g className="visual-zones" aria-hidden="true">
            <rect x="24" y="34" width="204" height="382" rx="24" className="zone-left" />
            <rect x="258" y="34" width="204" height="382" rx="24" className="zone-center" />
            <rect x="492" y="34" width="204" height="382" rx="24" className="zone-right" />
            <text x="126" y="67" textAnchor="middle">
              {visualType === 'causeEffect' ? '원인' : '입력'}
            </text>
            <text x="360" y="67" textAnchor="middle">과정 · 변화</text>
            <text x="594" y="67" textAnchor="middle">결과</text>
          </g>
        )}

        {visualType === 'spatial' && (
          <g className="spatial-scale" aria-hidden="true">
            <line x1="70" y1="380" x2="650" y2="380" />
            {nodes
              .filter((node) => typeof node.entity.quantity === 'number')
              .map((node) => (
                <g key={node.entity.label}>
                  <line x1={node.x} y1="370" x2={node.x} y2="390" />
                  <text x={node.x} y="410" textAnchor="middle">{node.entity.quantity}</text>
                </g>
              ))}
          </g>
        )}

        {visibleConnections.map((connection, index) => {
          const from = nodeByLabel.get(connection.from);
          const to = nodeByLabel.get(connection.to);
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const fromInset = Math.min(Math.max(from.width, from.height) / 2 + 8, length / 3);
          const toInset = Math.min(Math.max(to.width, to.height) / 2 + 10, length / 3);
          const x1 = from.x + (dx / length) * fromInset;
          const y1 = from.y + (dy / length) * fromInset;
          const x2 = to.x - (dx / length) * toInset;
          const y2 = to.y - (dy / length) * toInset;
          const labelX = (x1 + x2) / 2;
          const curve = Math.abs(dy) < 18 ? (index % 2 === 0 ? -24 : 24) : 0;
          const labelY = (y1 + y2) / 2 + curve - 13;
          const labelLines = wrapSvgText(connection.label, 11);
          const path = `M ${x1} ${y1} Q ${labelX} ${(y1 + y2) / 2 + curve} ${x2} ${y2}`;

          return (
            <g key={`${connection.from}-${connection.to}-${index}`} className="visual-connection">
              <path d={path} markerEnd={`url(#${arrowId})`} />
              <rect
                x={labelX - 50}
                y={labelY - 14}
                width="100"
                height={labelLines.length > 1 ? 40 : 27}
                rx="13"
              />
              <text x={labelX} y={labelY + 5} textAnchor="middle">
                {labelLines.map((line, lineIndex) => (
                  <tspan key={lineIndex} x={labelX} dy={lineIndex === 0 ? 0 : 14}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        })}

        {nodes.map((node, index) => {
          const { entity } = node;
          const labelLines = wrapSvgText(entity.label, node.emphasized ? 11 : 9);
          const icon = entity.iconHint?.trim().slice(0, 4) || '●';
          const dotCount =
            visualType === 'quantity' && typeof entity.quantity === 'number'
              ? Math.min(12, Math.max(0, Math.round(entity.quantity)))
              : 0;

          return (
            <g
              key={`${entity.label}-${index}`}
              transform={`translate(${node.x}, ${node.y})`}
              className={`visual-entity zone-${node.zone} ${node.emphasized ? 'center' : ''}`}
            >
              <rect
                x={-node.width / 2}
                y={-node.height / 2}
                width={node.width}
                height={node.height}
                rx={node.emphasized ? 28 : 20}
              />
              {node.step && (
                <g className="sequence-step" transform={`translate(${-node.width / 2 + 8}, ${-node.height / 2 + 8})`}>
                  <circle r="16" />
                  <text textAnchor="middle" y="5">{node.step}</text>
                </g>
              )}
              <text x="0" y={dotCount ? -31 : -13} textAnchor="middle" className="visual-entity-icon">{icon}</text>
              <text x="0" y={dotCount ? -5 : 11} textAnchor="middle" className="visual-entity-label">
                {labelLines.map((line, lineIndex) => (
                  <tspan key={lineIndex} x="0" dy={lineIndex === 0 ? 0 : 17}>{line}</tspan>
                ))}
              </text>
              {dotCount > 0 && (
                <g className="visual-quantity-group">
                  {Array.from({ length: dotCount }, (_, dot) => (
                    <circle
                      key={dot}
                      cx={-35 + (dot % 6) * 14}
                      cy={29 + Math.floor(dot / 6) * 14}
                      r="5"
                    />
                  ))}
                  <text x={node.width / 2 - 21} y={-node.height / 2 + 23} textAnchor="middle" className="visual-quantity">
                    {entity.quantity}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {visualType === 'comparison' && keyFacts.length > 0 && (
          <g className="comparison-facts">
            <rect x="118" y="382" width="484" height="58" rx="18" />
            <text x="360" y="404" textAnchor="middle">비교하며 살펴볼 점</text>
            <text x="360" y="426" textAnchor="middle">
              {wrapSvgText(keyFacts[0], 34)[0]}
            </text>
          </g>
        )}
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
  const hasDiagramData =
    visualData.entities.length >= 2 &&
    visualData.connections.length >= 1;

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
                  keyFacts={level1KeyFacts}
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
