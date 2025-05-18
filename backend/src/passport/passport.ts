import { PassportStatic } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { User, IUser } from '../models/User'; // Import IUser interface
import mongoose from 'mongoose'; // Import mongoose for ObjectId typing

export const configurePassport = (passport: PassportStatic): PassportStatic => {

    // Serialize user: store the user ID in the session
    passport.serializeUser((user: any, done) => {
        const userId = user.id || user._id;
        done(null, userId);
    });

    // Deserialize user: retrieve the user from the database using the ID stored in the session
    passport.deserializeUser((id: string, done) => {
        User.findById(id)
            .select('+role')
            .then(user => {
                done(null, user as IUser);
            })
            .catch(error => {
                done(error, null);
            });
    });

    // Configure the local strategy for username/password authentication
    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, (email, password, done) => {
        // Find the user by email
        User.findOne({ email: email })
             .select('+role')
            .then(user => {
                if (!user) {
                    return done(null, false, { message: 'Incorrect email or password.' });
                }
                user.comparePassword(password, (error, isMatch) => {
                    if (error) {
                        return done(error);
                    }
                    if (isMatch) {
                        done(null, user as IUser);
                    } else {
                        done(null, false, { message: 'Incorrect email or password.' });
                    }
                });
            })
            .catch(error => {
                return done(error);
            });
    }));

    return passport;
};
