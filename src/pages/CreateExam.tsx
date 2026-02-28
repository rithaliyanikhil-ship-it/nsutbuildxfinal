import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Question {
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer";
  options: string[];
  correct_answer: string;
  points: number;
}

const CreateExam = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScore, setPassingScore] = useState(50);
  const [maxViolations, setMaxViolations] = useState(5);
  const [isProctored, setIsProctored] = useState(true);
  const [allowFace, setAllowFace] = useState(true);
  const [allowVoice, setAllowVoice] = useState(true);
  const [allowTab, setAllowTab] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 },
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({
        created_by: user.id,
        title,
        description,
        duration_minutes: durationMinutes,
        passing_score: passingScore,
        max_violations: maxViolations,
        is_proctored: isProctored,
        allow_face_detection: allowFace,
        allow_voice_detection: allowVoice,
        allow_tab_switch_detection: allowTab,
        status: publish ? "published" : "draft",
      })
      .select()
      .single();

    if (examError) {
      toast({ title: "Error", description: examError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const questionsToInsert = questions
      .filter((q) => q.question_text.trim())
      .map((q, i) => ({
        exam_id: exam.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options.filter((o) => o.trim()),
        correct_answer: q.correct_answer,
        points: q.points,
        order_index: i,
      }));

    if (questionsToInsert.length > 0) {
      const { error: qError } = await supabase.from("questions").insert(questionsToInsert);
      if (qError) {
        toast({ title: "Error saving questions", description: qError.message, variant: "destructive" });
      }
    }

    toast({ title: "Exam created!", description: publish ? "Exam is now published." : "Exam saved as draft." });
    setLoading(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(+e.target.value)} min={1} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Passing Score (%)</Label>
                  <Input type="number" value={passingScore} onChange={(e) => setPassingScore(+e.target.value)} min={0} max={100} />
                </div>
                <div className="space-y-2">
                  <Label>Max Violations</Label>
                  <Input type="number" value={maxViolations} onChange={(e) => setMaxViolations(+e.target.value)} min={1} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Proctoring Settings</h3>
                <div className="flex items-center justify-between"><Label>Proctored Exam</Label><Switch checked={isProctored} onCheckedChange={setIsProctored} /></div>
                {isProctored && (
                  <>
                    <div className="flex items-center justify-between"><Label>Face Detection</Label><Switch checked={allowFace} onCheckedChange={setAllowFace} /></div>
                    <div className="flex items-center justify-between"><Label>Voice Detection</Label><Switch checked={allowVoice} onCheckedChange={setAllowVoice} /></div>
                    <div className="flex items-center justify-between"><Label>Tab/Browser Switch Detection</Label><Switch checked={allowTab} onCheckedChange={setAllowTab} /></div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Questions</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="mr-1 h-4 w-4" /> Add Question
                  </Button>
                </div>

                {questions.map((q, qi) => (
                  <Card key={qi} className="border-border">
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-start justify-between">
                        <Label>Question {qi + 1}</Label>
                        {questions.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qi)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Textarea value={q.question_text} onChange={(e) => updateQuestion(qi, "question_text", e.target.value)} placeholder="Enter question..." />
                      <div className="grid gap-2 md:grid-cols-2">
                        {q.options.map((opt, oi) => (
                          <Input key={oi} placeholder={`Option ${oi + 1} `} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                        ))}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Correct Answer</Label>
                          <Input value={q.correct_answer} onChange={(e) => updateQuestion(qi, "correct_answer", e.target.value)} placeholder="Enter correct answer" />
                        </div>
                        <div className="space-y-1">
                          <Label>Points</Label>
                          <Input type="number" value={q.points} onChange={(e) => updateQuestion(qi, "points", +e.target.value)} min={1} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="outline" disabled={loading}>Save Draft</Button>
                <Button type="button" disabled={loading} onClick={(e) => handleSubmit(e, true)}>Publish Exam</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateExam;
