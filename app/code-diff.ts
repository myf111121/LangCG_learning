export type DiffLine = { number: number; text: string };

export type SideBySideDiffRow = {
  kind: 'equal' | 'changed' | 'removed' | 'added';
  left?: DiffLine;
  right?: DiffLine;
};

type DiffOperation = {
  kind: 'equal' | 'removed' | 'added';
  line: DiffLine;
};

const splitLines = (value: string) => value.replace(/\r\n/g, '\n').split('\n');

export function buildSideBySideDiff(before: string, after: string): SideBySideDiffRow[] {
  const left = splitLines(before);
  const right = splitLines(after);
  if (left.length * right.length > 1_000_000) {
    return Array.from({ length: Math.max(left.length, right.length) }, (_, index) => {
      const leftText = left[index];
      const rightText = right[index];
      const leftLine = leftText === undefined ? undefined : { number: index + 1, text: leftText };
      const rightLine = rightText === undefined ? undefined : { number: index + 1, text: rightText };
      return {
        kind: leftText === rightText ? 'equal' : leftLine && rightLine ? 'changed' : leftLine ? 'removed' : 'added',
        left: leftLine,
        right: rightLine,
      };
    });
  }
  const lengths = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      lengths[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
        ? lengths[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(lengths[leftIndex + 1][rightIndex], lengths[leftIndex][rightIndex + 1]);
    }
  }

  const operations: DiffOperation[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    if (leftIndex < left.length && rightIndex < right.length && left[leftIndex] === right[rightIndex]) {
      operations.push({ kind: 'equal', line: { number: leftIndex + 1, text: left[leftIndex] } });
      leftIndex += 1;
      rightIndex += 1;
    } else if (leftIndex < left.length && (rightIndex === right.length || lengths[leftIndex + 1][rightIndex] >= lengths[leftIndex][rightIndex + 1])) {
      operations.push({ kind: 'removed', line: { number: leftIndex + 1, text: left[leftIndex] } });
      leftIndex += 1;
    } else {
      operations.push({ kind: 'added', line: { number: rightIndex + 1, text: right[rightIndex] } });
      rightIndex += 1;
    }
  }

  const rows: SideBySideDiffRow[] = [];
  let operationIndex = 0;
  let rightLineNumber = 1;
  while (operationIndex < operations.length) {
    const operation = operations[operationIndex];
    if (operation.kind === 'equal') {
      rows.push({
        kind: 'equal',
        left: operation.line,
        right: { number: rightLineNumber, text: operation.line.text },
      });
      rightLineNumber += 1;
      operationIndex += 1;
      continue;
    }

    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (operationIndex < operations.length && operations[operationIndex].kind !== 'equal') {
      const change = operations[operationIndex];
      if (change.kind === 'removed') removed.push(change.line);
      else {
        added.push(change.line);
        rightLineNumber += 1;
      }
      operationIndex += 1;
    }
    const changeRows = Math.max(removed.length, added.length);
    for (let index = 0; index < changeRows; index += 1) {
      const removedLine = removed[index];
      const addedLine = added[index];
      rows.push({
        kind: removedLine && addedLine ? 'changed' : removedLine ? 'removed' : 'added',
        left: removedLine,
        right: addedLine,
      });
    }
  }
  return rows;
}
