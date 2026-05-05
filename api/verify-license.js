export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { license_key } = req.body;

    if (!license_key) {
        return res.status(400).json({ error: 'License key is required.' });
    }

    try {
        // --- 1. VERIFICAR GUMROAD (Esto ya funciona perfecto) ---
        const gumroadParams = new URLSearchParams({
            product_id: 'RoWex3zd1wSforjN6MWsrA==',
            license_key: license_key,
            increment_uses_count: 'true' // Quema la licencia para que no se re-use
        });

        const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: gumroadParams
        });

        const gumroadData = await gumroadRes.json();

        if (!gumroadData.success || gumroadData.uses_count > 1) {
            return res.status(400).json({ error: 'Invalid or already used key.' });
        }

        // --- 2. GENERAR ENLACE DE TELEGRAM ---
        // ¡ATENCIÓN! REEMPLAZA EL TEXTO DE ABAJO POR TU NUEVO TOKEN DE BOTFATHER
        const tgToken = '8768137251:AAHs1_fIlUrboKszeMPMQ_TZo3SeJZttIXU'; 
        
        // El ID de tu grupo (este está correcto)
        const tgChatId = '-1003701221857';

        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/createChatInviteLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: tgChatId,
                member_limit: 1 // Link de 1 solo uso
            })
        });

        const tgData = await tgRes.json();

        // Si Telegram vuelve a fallar, lo veremos en Vercel
        if (!tgData.ok) {
            console.error("Telegram API Error:", tgData);
            return res.status(500).json({ error: 'Failed to generate access protocol.' });
        }

        const inviteLink = tgData.result.invite_link;

        // --- 3. RESPONDER A LA WEB ---
        return res.status(200).json({ invite_link: inviteLink });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
