"use client";
import React, { useState, useEffect, useContext } from "react";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormSection from "../_components/FormSection";
import OutputSection from "../_components/OutputSection";
import Templates from "@/app/(data)/Templates";
import { TEMPLATE } from "../../_component/TemplateListSection";
import { chatSession } from "@/utils/AIModel";
import { db } from "@/utils/db";
import { AIOutput } from "@/utils/schema";
import { TotalUsageContext } from "@/app/(context)/TotalUsageContext";
import { UserSubscriptionContext } from "@/app/(context)/UserSubscriptionContext";
import { UpdateCreditUsageContext } from "@/app/(context)/UpdateCreditUsageContext";



function CreateNewContent({ params }: { params: Promise<{ "template-slug": string }> }) {
  const [selectedTemplate, setSelectedTemplate] = useState<TEMPLATE | undefined>();
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>("");

  const { user } = useUser();
  const router = useRouter();

  const { totalUsage } = useContext(TotalUsageContext);
  const { userSubscription } = useContext(UserSubscriptionContext);
  const updateCreditUsage = useContext(UpdateCreditUsageContext);

  useEffect(() => {
    params.then((resolvedParams) => {
      const template = Templates.find((item) => item.slug === resolvedParams["template-slug"]);
      if (template) setSelectedTemplate(template);
    });
  }, [params]);

  const generateAIContent = async (formData: any) => {
    if (totalUsage >= 10000 && !userSubscription) {
      router.push("/dashboard/billing");
      return;
    }

    if (!selectedTemplate) return;

    setLoading(true);
    
    const finalAIPrompt = JSON.stringify(formData) + " , " + selectedTemplate.aiPrompt + " ";

    const result = await chatSession.sendMessage(finalAIPrompt);
    let aiResponse = await result?.response.text();
    
    setAiOutput(aiResponse);

    await saveInDb(formData, selectedTemplate.slug, aiResponse);
    setLoading(false);
    if (typeof updateCreditUsage === "function") updateCreditUsage();
  };

  const saveInDb = async (formData: any, slug: string, aiResp: string) => {
    try {
      await db.insert(AIOutput).values({
        formData: JSON.stringify(formData),
        templateSlug: slug,
        aiResponse: aiResp,
        createdBy: user?.primaryEmailAddress?.emailAddress ?? "default@domain.com",
        createdAt: moment().format("DD/MM/YYYY"),
      });
    } catch (error) {
      console.error("Error saving to DB:", error);
    }
  };

  return (
    <div className="p-10">
      <Link href={"/dashboard"}>
        <Button>
          <ArrowLeft /> Back
        </Button>
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-10">
        <FormSection
          selectedTemplate={selectedTemplate}
          userFormInput={(v: any) => generateAIContent(v)}
          loading={loading}
        />
        <div className="col-span-2">
          <OutputSection aiOutput={aiOutput} />
        </div>
      </div>
    </div>
  );
}

export default CreateNewContent;
