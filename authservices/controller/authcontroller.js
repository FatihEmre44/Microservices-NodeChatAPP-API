const {
    createAuth,
    findAuthByPhoneNumber,
    ensureAuth,
    updateAuthStatus,
    markAuthVerified,
    addRefreshToken,
    removeRefreshToken,
    clearRefreshTokens,
} = require('../service/userservice');

async function registerAuth(req, res, next) {
    try {
        // Numara var mı diye sormuyoruz, middleware zaten req.authPhoneNumber içine koyup gönderdi.
        const phoneNumber = req.authPhoneNumber; 

        const existingAuth = await findAuthByPhoneNumber(phoneNumber);
        if (existingAuth) {
            return res.status(200).json({
                success: true,
                message: 'Auth record already exists',
                data: existingAuth,
            });
        }

        const auth = await createAuth({
            phoneNumber,
            twoStepPin: req.body.twoStepPin ?? null,
            isVerified: req.body.isVerified ?? false,
            status: req.body.status,
            refreshTokens: req.body.refreshTokens,
        });

        return res.status(201).json({ success: true, message: 'Auth record created', data: auth });
    } catch (error) {
        next(error);
    }
}

async function upsertAuth(req, res, next) {
    try {
        const auth = await ensureAuth(req.authPhoneNumber);
        return res.status(200).json({
            success: true,
            message: auth.phoneNumber === req.authPhoneNumber ? 'Auth record ready' : 'Auth record created',
            data: auth,
        });
    } catch (error) {
        next(error);
    }
}

async function getAuth(req, res, next) {
    try {
        const auth = await findAuthByPhoneNumber(req.authPhoneNumber);

        if (!auth) {
            return res.status(404).json({ success: false, message: 'Auth record not found' });
        }

        return res.status(200).json({ success: true, data: auth });
    } catch (error) {
        next(error);
    }
}

async function verifyAuth(req, res, next) {
    try {
        const { code } = req.body; // SMS kodu kontrolünü unutma!
        if (!code) {
             return res.status(400).json({ success: false, message: 'code is required' });
        }

        const auth = await findAuthByPhoneNumber(req.authPhoneNumber);
        if (!auth) return res.status(404).json({ success: false, message: 'Auth record not found' });

        // Burada SMS kodu doğru mu diye kontrol ediyoruz (Örnek)
        // if (auth.otpCode !== code) return res.status(401).json({ success: false, message: 'Invalid code' });

        const updatedAuth = await markAuthVerified(req.authPhoneNumber);

        return res.status(200).json({ success: true, message: 'Auth record verified', data: updatedAuth });
    } catch (error) {
        next(error);
    }
}

async function updateStatus(req, res, next) {
    try {
        // req.authStatus da middleware'den geliyor! (requireStatus middleware'i)
        const auth = await updateAuthStatus(req.authPhoneNumber, req.authStatus);

        if (!auth) return res.status(404).json({ success: false, message: 'Auth record not found' });

        return res.status(200).json({ success: true, message: 'Auth status updated', data: auth });
    } catch (error) {
        next(error);
    }
}

async function addToken(req, res, next) {
    try {
        // req.authRefreshToken middleware'den geliyor! Bütün if'ler çöpe!
        const auth = await addRefreshToken(req.authPhoneNumber, req.authRefreshToken);

        if (!auth) return res.status(404).json({ success: false, message: 'Auth record not found' });

        return res.status(200).json({ success: true, message: 'Refresh token added', data: auth });
    } catch (error) {
        next(error);
    }
}

async function removeToken(req, res, next) {
    try {
        const auth = await removeRefreshToken(req.authPhoneNumber, req.authRefreshToken);

        if (!auth) return res.status(404).json({ success: false, message: 'Auth record not found' });

        return res.status(200).json({ success: true, message: 'Refresh token removed', data: auth });
    } catch (error) {
        next(error);
    }
}

async function clearTokens(req, res, next) {
    try {
        const auth = await clearRefreshTokens(req.authPhoneNumber);

        if (!auth) return res.status(404).json({ success: false, message: 'Auth record not found' });

        return res.status(200).json({ success: true, message: 'Refresh tokens cleared', data: auth });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    registerAuth,
    upsertAuth,
    getAuth,
    verifyAuth,
    updateStatus,
    addToken,
    removeToken,
    clearTokens,
};