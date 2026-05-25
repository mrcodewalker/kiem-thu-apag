with open(r'c:\Users\ADMIN\APAG\apag-fe\e2e\E2E_ENRICHED_SPEC.md', 'r', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')
print(f'Total lines: {len(lines)}')
print(f'Total chars: {len(content)}')
print(f'KB: {len(content.encode("utf-8"))/1024:.1f}')
# Sample to verify diacritics
print('--- First 200 chars ---')
print(content[:200])
