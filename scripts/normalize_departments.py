import json
import re
from collections import Counter

INPUT = "./data/office_hours.json"

def normalize(dept):
    if not dept:
        return dept
    d = dept.strip()
    low = d.lower()

    # AI group: variants containing data / science / artificial / intelligent / ai
    if re.search(r'\b(data\s*science|data|artificial|intelligen|ai)\b', low):
        return 'ai'

    # CS group: computer or cs
    if re.search(r'\b(computer|cs)\b', low):
        return 'cs'

    # Cyber group: cyber or security
    if re.search(r'\b(cyber|security|cybersecurity)\b', low):
        return 'cyber'

    return d


def main():
    with open(INPUT, encoding='utf-8') as f:
        records = json.load(f)

    counts_before = Counter(r.get('department','') for r in records)

    for r in records:
        r['department'] = normalize(r.get('department',''))

    counts_after = Counter(r.get('department','') for r in records)

    with open(INPUT, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print('Normalized departments written to', INPUT)
    print('Before:', counts_before)
    print('After:', counts_after)


if __name__ == '__main__':
    main()
