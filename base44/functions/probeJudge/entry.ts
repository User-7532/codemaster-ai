export default async function (req) {
  const started = Date.now();
  try {
    const r = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'gcc-13.2.0-c',
        code: '#include <stdio.h>\nint main(){int a,b;scanf("%d %d",&a,&b);printf("%d\\n",a+b);return 0;}',
        stdin: '2 3\n',
      }),
    });
    const text = await r.text();
    let out = '';
    try { out = JSON.parse(text).program_output || ''; } catch (_e) {}
    return Response.json({ ok: r.ok, status: r.status, program_output: out, ms: Date.now() - started, raw: text.slice(0, 300) });
  } catch (e) {
    return Response.json({ ok: false, egress_error: String((e && e.message) || e), ms: Date.now() - started });
  }
}
