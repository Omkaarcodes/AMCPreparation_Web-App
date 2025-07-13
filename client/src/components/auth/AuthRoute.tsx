import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { authentification } from './firebaseConfig';

export interface IAuthRouteProps {
    children: React.ReactNode;
}

const AuthRoute: React.FunctionComponent<IAuthRouteProps> = (props) => {
    const { children } = props;
    const auth = authentification;
    const navigate = useNavigate();
    const [ loading, setLoading ] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoading(false);
            } else {
                console.log('Unauthorized');
                setLoading(false);
                navigate('/login')
            }
        });
        return () => unsubscribe();
    }, [auth, navigate]);

    if (loading) return <p></p>;

    return <div>{ children }</div>;

}

export default AuthRoute