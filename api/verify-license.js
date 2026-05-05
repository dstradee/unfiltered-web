export default async function handler(req, res) {
    // 1. Por seguridad, solo permitimos que la web se comunique por método POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Extraemos la licencia que el usuario ha escrito en la web
    const { license_key } = req.body;

    if (!license_key) {
        return res.status(400).json({ error: 'License key is required.' });
    }

    try {
        // --- PASO A: VERIFICAR LA LICENCIA EN GUMROAD ---
        // Usamos increment_uses_count=true para "quemar" la llave inmediatamente
        const gumroadParams = new URLSearchParams({
            product_id: 'RoWex3zd1wSforjN6MWsrA==',
            license_key: license_key,
            increment_uses_count: 'true'
        });

        const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: gumroadParams
        });

        const gumroadData = await gumroadRes.json();

        // Si Gumroad dice que es falsa, o si el contador de usos es mayor a 1 (ya la han usado)
        if (!gumroadData.success || gumroadData.uses_count > 1) {
            return res.status(400).json({ error: 'Invalid or already used key.' });
        }

        // --- PASO B: GENERAR ENLACE DE TELEGRAM DE 1 SOLO USO ---
        // Coge el token de las Variables de Entorno de Vercel (o usa este por defecto si falla)
        const tgToken = process.env.TELEGRAM_BOT_TOKEN || '8768137251:AAHs1_fIlUrboKszeMPMQ_TZo3SeJZttIXU';
        const tgChatId = '-1003701221857';

        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/createChatInviteLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: tgChatId,
                member_limit: 1 // CRÍTICO: Esto hace que el link solo sirva para 1 persona
            })
        });

        const tgData = await tgRes.json();

        if (!tgData.ok) {
            console.error("Telegram API Error:", tgData);
            return res.status(500).json({ error: 'Failed to generate access protocol.' });
        }

        // Extraemos el enlace único generado por Telegram
        const inviteLink = tgData.result.invite_link;

        // --- PASO C: RESPONDER A LA WEB ---
        // Le enviamos a tu vsl.html un código 200 (Éxito) y el enlace directo al grupo
        return res.status(200).json({ invite_link: inviteLink });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
