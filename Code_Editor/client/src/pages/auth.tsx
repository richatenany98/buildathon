import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface AuthForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function Auth() {
  const [location, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState<AuthForm>({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<string[]>([]);
  const { login, signup } = useAuth();

  const authMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isLogin) {
        await login(data.email, data.password);
      } else {
        await signup(data.email, data.username, data.password);
      }
    },
    onSuccess: () => {
      // Small delay to ensure auth state is updated before redirecting
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    },
    onError: (error: Error) => {
      setErrors([error.message]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validation
    const newErrors: string[] = [];
    
    if (!form.email) newErrors.push("Email is required");
    if (!form.password) newErrors.push("Password is required");
    
    if (!isLogin) {
      if (!form.username) newErrors.push("Username is required");
      if (form.password !== form.confirmPassword) {
        newErrors.push("Passwords do not match");
      }
      if (form.password.length < 6) {
        newErrors.push("Password must be at least 6 characters");
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const authData = {
      email: form.email,
      password: form.password,
      username: form.username
    };

    authMutation.mutate(authData);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors([]);
    setForm({
      email: "",
      username: "",
      password: "",
      confirmPassword: ""
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">CS</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">CodeStream</h1>
          <p className="text-gray-400">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.length > 0 && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                {errors.map((error, index) => (
                  <p key={index} className="text-red-400 text-sm">{error}</p>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="johndoe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authMutation.isPending 
                ? (isLogin ? "Signing in..." : "Creating account...") 
                : (isLogin ? "Sign In" : "Create Account")
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={toggleMode}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Demo credentials for testing */}
        {isLogin && (
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm text-center">
              Demo: Use any email and password to test (account will be created automatically)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}