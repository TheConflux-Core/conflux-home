with open('.github/workflows/build-release.yml', 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
replaced = 0

while i < len(lines):
    # Look for the "echo Patching version to $VER" line
    if 'echo "Patching version to $VER"' in lines[i]:
        # Check if next line is python3 heredoc
        if i + 1 < len(lines) and "python3 << 'PYEOF'" in lines[i+1]:
            # This is a patch step to replace
            # Find where the heredoc ends (PYEOF line, with leading spaces)
            j = i + 2
            while j < len(lines) and '          PYEOF' not in lines[j]:
                j += 1
            # j now points to PYEOF line
            # j+1 should be the "$VER" line
            
            # Build the new block
            new_block = [
                '          echo "Patching version to $VER"\n',
                '          cat << \'PYEOF\' > /tmp/patch_version.py\n',
                'import re, sys\n',
                'ver = sys.argv[1]\n',
                "for f in ['src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json', 'package.json']:\n",
                "    with open(f, 'r') as fh:\n",
                "        txt = fh.read()\n",
                "    if f == 'src-tauri/Cargo.toml':\n",
                "        txt = re.sub(r'^version = .+$', f'version = \"{ver}\"', txt, flags=re.MULTILINE)\n",
                "    else:\n",
                "        txt = re.sub(r'\"version\":\\s*\"[^\"]*\"', f'\"version\": \"{ver}\"', txt)\n",
                "    with open(f, 'w') as fh:\n",
                "        fh.write(txt)\n",
                "PYEOF\n",
                '          python3 /tmp/patch_version.py "$VER"\n',
            ]
            new_lines.extend(new_block)
            i = j + 2  # skip past PYEOF and "$VER"
            replaced += 1
            continue
    new_lines.append(lines[i])
    i += 1

print(f"Replaced {replaced} patch blocks")

with open('.github/workflows/build-release.yml', 'w') as f:
    f.writelines(new_lines)
print("Done")