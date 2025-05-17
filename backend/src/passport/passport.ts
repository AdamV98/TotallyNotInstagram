import { PassportStatic } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { User } from '../models/User';

export const configurePassport = (passport: PassportStatic): PassportStatic => {

    passport.serializeUser((user: any, done) => {
        done(null, user.id || user._id);
    });

    passport.deserializeUser((id: string, done) => {
        User.findById(id)
            .then(user => {
                done(null, user);
            })
            .catch(error => {
                done(error, null);
            });
    });

    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, (email, password, done) => {
        User.findOne({ email: email })
            .then(user => {
                if (!user) {
                    return done(null, false, { message: 'Incorrect email or password.' });
                }

                user.comparePassword(password, (error, isMatch) => {
                    if (error) {
                        return done(error);
                    }
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: 'Incorrect email or password.' });
                    }
                });
            })
            .catch(error => {
                return done(error);
            });
    }));

    return passport;
};
